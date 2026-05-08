using System.Net.NetworkInformation;
using System.Net.Sockets;

namespace SapphWire.Core;

public class WindowsNetworkAdapterEnumerator : INetworkAdapterEnumerator
{
    private static readonly string[] VirtualPrefixes =
    {
        "Tunnel", "Loopback", "vEthernet", "WSL", "Docker",
        "Hyper-V", "VirtualBox", "VMware"
    };

    public IReadOnlyList<AdapterInfo> GetAdapters()
    {
        return NetworkInterface.GetAllNetworkInterfaces()
            .Where(i => i.NetworkInterfaceType != NetworkInterfaceType.Loopback)
            .Select(ToAdapterInfo)
            .ToList();
    }

    private static AdapterInfo ToAdapterInfo(NetworkInterface iface)
    {
        var ipProps = iface.GetIPProperties();
        var hasGateway = ipProps.GatewayAddresses
            .Any(g => g.Address.AddressFamily == AddressFamily.InterNetwork);

        var isVirtual = IsVirtualInterface(iface);
        var ssid = GetSsid(iface);

        return new AdapterInfo(
            Name: iface.Name,
            InterfaceType: iface.NetworkInterfaceType,
            Status: iface.OperationalStatus,
            HasDefaultRoute: hasGateway && !isVirtual,
            IsVirtual: isVirtual,
            Ssid: ssid,
            ProfileName: iface.Name
        );
    }

    private static bool IsVirtualInterface(NetworkInterface iface)
    {
        var name = iface.Name;
        var desc = iface.Description;
        return VirtualPrefixes.Any(p =>
            name.StartsWith(p, StringComparison.OrdinalIgnoreCase) ||
            desc.Contains(p, StringComparison.OrdinalIgnoreCase));
    }

    private static string? GetSsid(NetworkInterface iface)
    {
        if (iface.NetworkInterfaceType != NetworkInterfaceType.Wireless80211)
            return null;
        // Real implementation uses Wlanapi P/Invoke on Windows:
        // WlanOpenHandle → WlanGetAvailableNetworkList → match connected SSID
        // Stubbed for non-Windows builds
        return null;
    }
}
