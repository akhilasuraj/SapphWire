namespace SapphWire.Core;

public class DiscoveredDevice
{
    public required string Mac { get; set; }
    public string Ip { get; set; } = "";
    public string Hostname { get; set; } = "";
    public string Vendor { get; set; } = "";
    public DeviceType DeviceType { get; set; } = DeviceType.Unknown;
    public string? FriendlyName { get; set; }
    public bool Pinned { get; set; }
    public string NetworkId { get; set; } = "";
    public DateTimeOffset FirstSeen { get; set; }
    public DateTimeOffset LastSeen { get; set; }
    public bool IsThisPc { get; set; }
    public bool IsGateway { get; set; }

    public bool IsOnline(TimeSpan threshold)
    {
        return DateTimeOffset.UtcNow - LastSeen < threshold;
    }
}
