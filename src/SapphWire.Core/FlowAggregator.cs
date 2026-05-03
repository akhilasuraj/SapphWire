namespace SapphWire.Core;

public class FlowAggregator
{
    private readonly object _lock = new();
    private readonly LinkedList<ThroughputBucket> _buckets = new();
    private readonly int _maxBuckets;
    private long _pendingUp;
    private long _pendingDown;
    private readonly Dictionary<int, (long Up, long Down)> _pendingByPid = new();
    private readonly Dictionary<FlowKey, (long Up, long Down)> _pendingByFlow = new();

    public FlowAggregator(int maxBuckets = 300)
    {
        _maxBuckets = maxBuckets;
    }

    public void Ingest(NetworkEvent evt)
    {
        lock (_lock)
        {
            var isUp = evt.Direction == TrafficDirection.Up;

            if (isUp)
                _pendingUp += evt.Bytes;
            else
                _pendingDown += evt.Bytes;

            Accumulate(_pendingByPid, evt.ProcessId, evt.Bytes, isUp);
            Accumulate(_pendingByFlow, new FlowKey(evt.ProcessId, evt.RemoteIp, evt.RemotePort), evt.Bytes, isUp);
        }
    }

    private static void Accumulate<TKey>(
        Dictionary<TKey, (long Up, long Down)> dict, TKey key, long bytes, bool isUp)
        where TKey : notnull
    {
        dict.TryGetValue(key, out var current);
        dict[key] = isUp
            ? (current.Up + bytes, current.Down)
            : (current.Up, current.Down + bytes);
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

    public Dictionary<FlowKey, (long Up, long Down)> DrainPerFlow()
    {
        lock (_lock)
        {
            var snapshot = new Dictionary<FlowKey, (long Up, long Down)>(_pendingByFlow);
            _pendingByFlow.Clear();
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
