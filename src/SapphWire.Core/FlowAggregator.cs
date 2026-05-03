namespace SapphWire.Core;

public class FlowAggregator
{
    private readonly object _lock = new();
    private readonly LinkedList<ThroughputBucket> _buckets = new();
    private readonly int _maxBuckets;
    private long _pendingUp;
    private long _pendingDown;
    private readonly Dictionary<int, (long Up, long Down)> _pendingByPid = new();

    public FlowAggregator(int maxBuckets = 300)
    {
        _maxBuckets = maxBuckets;
    }

    public void Ingest(NetworkEvent evt)
    {
        lock (_lock)
        {
            if (evt.Direction == TrafficDirection.Up)
                _pendingUp += evt.Bytes;
            else
                _pendingDown += evt.Bytes;

            _pendingByPid.TryGetValue(evt.ProcessId, out var current);
            if (evt.Direction == TrafficDirection.Up)
                _pendingByPid[evt.ProcessId] = (current.Up + evt.Bytes, current.Down);
            else
                _pendingByPid[evt.ProcessId] = (current.Up, current.Down + evt.Bytes);
        }
    }

    public ThroughputBucket Tick(DateTimeOffset now)
    {
        lock (_lock)
        {
            var bucket = new ThroughputBucket(now, _pendingUp, _pendingDown);
            _pendingUp = 0;
            _pendingDown = 0;

            _buckets.AddLast(bucket);
            while (_buckets.Count > _maxBuckets)
                _buckets.RemoveFirst();

            return bucket;
        }
    }

    public Dictionary<int, (long Up, long Down)> DrainPerPid()
    {
        lock (_lock)
        {
            var snapshot = new Dictionary<int, (long Up, long Down)>(_pendingByPid);
            _pendingByPid.Clear();
            return snapshot;
        }
    }

    public IReadOnlyList<ThroughputBucket> GetSnapshot()
    {
        lock (_lock)
        {
            return _buckets.ToList();
        }
    }
}
