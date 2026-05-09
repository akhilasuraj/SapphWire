using System.Collections.Concurrent;

namespace SapphWire.Core;

public class HostnameResolver : IHostnameResolver
{
    private readonly IDnsSource _dns;
    private readonly Func<DateTimeOffset> _clock;
    private static readonly TimeSpan SuccessTtl = TimeSpan.FromHours(24);
    private static readonly TimeSpan FailureTtl = TimeSpan.FromMinutes(5);

    private readonly ConcurrentDictionary<string, CacheEntry> _cache = new();
    private readonly ConcurrentDictionary<string, Lazy<Task<string?>>> _inflight = new();

    private record CacheEntry(string? Hostname, DateTimeOffset Expiry);

    public HostnameResolver(IDnsSource dns, Func<DateTimeOffset>? clock = null)
    {
        _dns = dns;
        _clock = clock ?? (() => DateTimeOffset.UtcNow);
    }

    public string? TryResolve(string ip)
    {
        if (_cache.TryGetValue(ip, out var entry) && entry.Expiry > _clock())
            return entry.Hostname;
        return null;
    }

    public async Task<string?> ResolveAsync(string ip)
    {
        if (_cache.TryGetValue(ip, out var entry) && entry.Expiry > _clock())
            return entry.Hostname;

        var lazy = _inflight.GetOrAdd(ip,
            _ => new Lazy<Task<string?>>(() => DoLookupAsync(ip)));

        return await lazy.Value;
    }

    private async Task<string?> DoLookupAsync(string ip)
    {
        try
        {
            var hostname = await _dns.LookupPtrAsync(ip);
            var ttl = hostname != null ? SuccessTtl : FailureTtl;
            _cache[ip] = new CacheEntry(hostname, _clock() + ttl);
            return hostname;
        }
        finally
        {
            _inflight.TryRemove(ip, out _);
        }
    }
}
