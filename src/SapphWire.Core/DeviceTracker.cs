namespace SapphWire.Core;

public class DeviceTracker
{
    private readonly object _lock = new();
    private readonly Dictionary<string, DiscoveredDevice> _devices = new(StringComparer.OrdinalIgnoreCase);
    private readonly OuiDatabase _oui;
    private readonly TimeSpan _onlineThreshold;

    public event Action<DiscoveredDevice>? DeviceUpdated;
    public event Action<string>? DeviceRemoved;

    public DeviceTracker(OuiDatabase oui, TimeSpan? onlineThreshold = null)
    {
        _oui = oui;
        _onlineThreshold = onlineThreshold ?? TimeSpan.FromSeconds(90);
    }

    public void Upsert(string mac, string ip, string hostname, string networkId,
        DeviceType deviceType = DeviceType.Unknown,
        bool isThisPc = false, bool isGateway = false)
    {
        lock (_lock)
        {
            var now = DateTimeOffset.UtcNow;
            var vendor = _oui.Lookup(mac) ?? "";

            if (_devices.TryGetValue(mac, out var existing))
            {
                existing.Ip = ip.Length > 0 ? ip : existing.Ip;
                existing.Hostname = hostname.Length > 0 ? hostname : existing.Hostname;
                existing.Vendor = vendor.Length > 0 ? vendor : existing.Vendor;
                existing.NetworkId = networkId;
                existing.LastSeen = now;
                if (deviceType != DeviceType.Unknown)
                    existing.DeviceType = deviceType;
                existing.IsThisPc = isThisPc || existing.IsThisPc;
                existing.IsGateway = isGateway || existing.IsGateway;

                DeviceUpdated?.Invoke(existing);
            }
            else
            {
                var device = new DiscoveredDevice
                {
                    Mac = mac.ToUpperInvariant(),
                    Ip = ip,
                    Hostname = hostname,
                    Vendor = vendor,
                    DeviceType = deviceType,
                    NetworkId = networkId,
                    FirstSeen = now,
                    LastSeen = now,
                    IsThisPc = isThisPc,
                    IsGateway = isGateway,
                };
                _devices[mac] = device;
                DeviceUpdated?.Invoke(device);
            }
        }
    }

    public void SetFriendlyName(string mac, string name)
    {
        lock (_lock)
        {
            if (_devices.TryGetValue(mac, out var device))
            {
                device.FriendlyName = string.IsNullOrWhiteSpace(name) ? null : name;
                DeviceUpdated?.Invoke(device);
            }
        }
    }

    public void TogglePin(string mac)
    {
        lock (_lock)
        {
            if (_devices.TryGetValue(mac, out var device))
            {
                device.Pinned = !device.Pinned;
                DeviceUpdated?.Invoke(device);
            }
        }
    }

    public void Forget(string mac)
    {
        lock (_lock)
        {
            if (_devices.Remove(mac))
                DeviceRemoved?.Invoke(mac);
        }
    }

    public IReadOnlyList<DiscoveredDevice> GetDevices(string? networkId = null)
    {
        lock (_lock)
        {
            var query = _devices.Values.AsEnumerable();
            if (networkId != null)
                query = query.Where(d => d.NetworkId == networkId);
            return query.ToList();
        }
    }

    public IReadOnlyList<object> GetSnapshot(string? networkId = null)
    {
        lock (_lock)
        {
            var devices = _devices.Values.AsEnumerable();
            if (networkId != null)
                devices = devices.Where(d => d.NetworkId == networkId);

            return devices.Select(d => new
            {
                d.Mac,
                d.Ip,
                d.Hostname,
                d.Vendor,
                DeviceType = d.DeviceType.ToString(),
                d.FriendlyName,
                d.Pinned,
                d.NetworkId,
                FirstSeen = d.FirstSeen.ToString("o"),
                LastSeen = d.LastSeen.ToString("o"),
                Online = d.IsOnline(_onlineThreshold),
                d.IsThisPc,
                d.IsGateway,
            }).ToList<object>();
        }
    }
}
