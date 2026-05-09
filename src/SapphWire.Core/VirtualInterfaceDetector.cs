using System.Net.NetworkInformation;

namespace SapphWire.Core;

internal static class VirtualInterfaceDetector
{
    internal static readonly string[] Prefixes =
    {
        "Tunnel", "Loopback", "vEthernet", "WSL", "Docker",
        "Hyper-V", "VirtualBox", "VMware"
    };

    internal static bool IsVirtual(NetworkInterface iface)
    {
        var name = iface.Name;
        var desc = iface.Description;
        return Prefixes.Any(p =>
            name.StartsWith(p, StringComparison.OrdinalIgnoreCase) ||
            desc.Contains(p, StringComparison.OrdinalIgnoreCase));
    }
}
