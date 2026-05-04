namespace SapphWire.Core;

public record DiscoveryEvent(
    string Mac,
    string Ip,
    string Hostname = "",
    DeviceType DeviceType = DeviceType.Unknown
);

public interface IDiscoverySource
{
    event Action<DiscoveryEvent>? DeviceDiscovered;
    Task StartAsync(CancellationToken cancellationToken);
    Task StopAsync(CancellationToken cancellationToken);
}
