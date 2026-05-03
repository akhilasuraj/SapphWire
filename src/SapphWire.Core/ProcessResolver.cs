using System.Collections.Concurrent;

namespace SapphWire.Core;

public class ProcessResolver : IProcessResolver
{
    private readonly ConcurrentDictionary<int, ProcessInfo> _cache = new();
    private readonly IProcessSource _source;
    internal static readonly ProcessInfo Unknown = new("Unknown", "", "", "", "");

    public ProcessResolver(IProcessSource source)
    {
        _source = source;
    }

    public ProcessInfo Resolve(int processId)
    {
        return _cache.GetOrAdd(processId, pid => _source.GetInfo(pid) ?? Unknown);
    }

    public void Invalidate(int processId)
    {
        _cache.TryRemove(processId, out _);
    }
}
