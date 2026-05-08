using System.Net.NetworkInformation;

namespace SapphWire.Core;

public record AdapterInfo(
    string Name,
    NetworkInterfaceType InterfaceType,
    OperationalStatus Status,
    bool HasDefaultRoute,
    bool IsVirtual,
    string? Ssid,
    string? ProfileName
);

public interface INetworkAdapterEnumerator
{
    IReadOnlyList<AdapterInfo> GetAdapters();
}
