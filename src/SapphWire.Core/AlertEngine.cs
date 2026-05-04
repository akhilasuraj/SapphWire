namespace SapphWire.Core;

public class AlertEngine
{
    private readonly HashSet<string> _knownApps;

    public AlertEngine(IEnumerable<string> alreadySeenApps)
    {
        _knownApps = new HashSet<string>(alreadySeenApps, StringComparer.OrdinalIgnoreCase);
    }

    public AlertRecord? Evaluate(FlowKey flowKey, ProcessInfo processInfo, DateTimeOffset timestamp)
    {
        if (IsExcluded(flowKey.RemoteIp))
            return null;

        var appKey = AppGrouper.GetAppKey(processInfo);

        if (!_knownApps.Add(appKey))
            return null;

        return new AlertRecord(
            Id: 0,
            Timestamp: timestamp,
            AppName: appKey,
            ExePath: processInfo.ExePath,
            RemoteIp: flowKey.RemoteIp,
            RemotePort: flowKey.RemotePort,
            IsRead: false
        );
    }

    internal static bool IsExcluded(string ip)
    {
        if (string.IsNullOrEmpty(ip))
            return true;

        // IPv6 loopback
        if (ip == "::1")
            return true;

        // IPv4 loopback 127.0.0.0/8
        if (ip.StartsWith("127."))
            return true;

        // IPv6 link-local fe80::/10
        if (ip.StartsWith("fe80:", StringComparison.OrdinalIgnoreCase))
            return true;

        // IPv4 link-local 169.254.0.0/16
        if (ip.StartsWith("169.254."))
            return true;

        return false;
    }
}
