namespace SapphWire.Core;

public class AppUsageRanker
{
    private readonly IInstalledAppsProvider _installedApps;
    private readonly Func<DateTimeOffset> _clock;
    private static readonly TimeSpan DropOffPeriod = TimeSpan.FromDays(7);

    private readonly object _lock = new();
    private readonly Dictionary<string, AppEntry> _entries = new(StringComparer.OrdinalIgnoreCase);
    private List<RankedAppRow> _ranking = new();

    public AppUsageRanker(IInstalledAppsProvider installedApps, Func<DateTimeOffset> clock)
    {
        _installedApps = installedApps;
        _clock = clock;
    }

    public void RecordTraffic(string appId, long bytesUp, long bytesDown)
    {
        lock (_lock)
        {
            var now = _clock();
            if (!_entries.TryGetValue(appId, out var entry))
            {
                entry = new AppEntry { AppId = appId };
                _entries[appId] = entry;
            }

            entry.CumulativeBytes += bytesUp + bytesDown;
            entry.LastSeen = now;
            entry.PendingUp += bytesUp;
            entry.PendingDown += bytesDown;
        }
    }

    public void Tick()
    {
        lock (_lock)
        {
            var now = _clock();
            var cutoff = now - DropOffPeriod;

            var previousOrder = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < _ranking.Count; i++)
                previousOrder[_ranking[i].AppId] = i;

            var active = _entries.Values
                .Where(e => e.LastSeen > cutoff)
                .ToList();

            active.Sort((a, b) =>
            {
                var cmp = b.CumulativeBytes.CompareTo(a.CumulativeBytes);
                if (cmp != 0) return cmp;

                var aIdx = previousOrder.GetValueOrDefault(a.AppId, int.MaxValue);
                var bIdx = previousOrder.GetValueOrDefault(b.AppId, int.MaxValue);
                return aIdx.CompareTo(bIdx);
            });

            _ranking = active.Select(e => new RankedAppRow(
                AppId: e.AppId,
                CumulativeBytes: e.CumulativeBytes,
                CurrentUp: e.PendingUp,
                CurrentDown: e.PendingDown,
                LastSeen: e.LastSeen,
                IsInstalledOnly: false
            )).ToList();

            foreach (var entry in _entries.Values)
            {
                entry.PendingUp = 0;
                entry.PendingDown = 0;
            }
        }
    }

    public IReadOnlyList<RankedAppRow> RankedApps(bool includeInstalled)
    {
        lock (_lock)
        {
            if (!includeInstalled)
                return _ranking.ToList();

            var result = new List<RankedAppRow>(_ranking);
            var seen = new HashSet<string>(_ranking.Select(r => r.AppId), StringComparer.OrdinalIgnoreCase);

            foreach (var app in _installedApps.GetInstalledApps())
            {
                if (seen.Contains(app.AppId)) continue;
                result.Add(new RankedAppRow(
                    AppId: app.AppId,
                    CumulativeBytes: 0,
                    CurrentUp: 0,
                    CurrentDown: 0,
                    LastSeen: DateTimeOffset.MinValue,
                    IsInstalledOnly: true
                ));
            }

            return result;
        }
    }

    public IReadOnlyDictionary<string, (long CumulativeBytes, DateTimeOffset LastSeen)> GetState()
    {
        lock (_lock)
        {
            return _entries.ToDictionary(
                kv => kv.Value.AppId,
                kv => (kv.Value.CumulativeBytes, kv.Value.LastSeen),
                StringComparer.OrdinalIgnoreCase);
        }
    }

    public void LoadState(IEnumerable<KeyValuePair<string, (long CumulativeBytes, DateTimeOffset LastSeen)>> state)
    {
        lock (_lock)
        {
            foreach (var (appId, (cumulative, lastSeen)) in state)
            {
                _entries[appId] = new AppEntry
                {
                    AppId = appId,
                    CumulativeBytes = cumulative,
                    LastSeen = lastSeen,
                };
            }
        }
    }

    private class AppEntry
    {
        public required string AppId;
        public long CumulativeBytes;
        public DateTimeOffset LastSeen;
        public long PendingUp;
        public long PendingDown;
    }
}
