using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using Microsoft.Extensions.Logging;

namespace SapphWire.Core;

public class NetworkContext
{
    private readonly ILogger<NetworkContext> _logger;
    private NetworkInfo? _current;

    public event Action<NetworkInfo>? NetworkChanged;

    public NetworkInfo? Current => _current;

    private static readonly string[] VirtualPrefixes =
    {
        "Tunnel", "Loopback", "vEthernet", "WSL", "Docker",
        "Hyper-V", "VirtualBox", "VMware"
    };

    public NetworkContext(ILogger<NetworkContext> logger)
    {
        _logger = logger;
    }

    public void Refresh()
    {
        try
        {
            var iface = GetDefaultInterface();
            if (iface == null)
            {
                _current = null;
                return;
            }

            var ipProps = iface.GetIPProperties();
            var unicast = ipProps.UnicastAddresses
                .FirstOrDefault(a => a.Address.AddressFamily == AddressFamily.InterNetwork);

            var gateway = ipProps.GatewayAddresses
                .FirstOrDefault(g => g.Address.AddressFamily == AddressFamily.InterNetwork);

            var dns = ipProps.DnsAddresses
                .Where(a => a.AddressFamily == AddressFamily.InterNetwork)
                .Select(a => a.ToString())
                .ToArray();

            var ssid = GetSsid(iface);

            var info = new NetworkInfo(
                Ssid: ssid ?? iface.Name,
                ConnectionState: iface.OperationalStatus == OperationalStatus.Up ? "Connected" : "Disconnected",
                GatewayIp: gateway?.Address.ToString() ?? "",
                GatewayMac: "",
                DnsServers: dns,
                LocalIp: unicast?.Address.ToString() ?? "",
                SubnetMask: unicast?.IPv4Mask?.ToString() ?? "255.255.255.0"
            );

            var changed = _current == null || _current != info;
            _current = info;

            if (changed)
            {
                _logger.LogInformation("Network changed: {Ssid} ({State})", info.Ssid, info.ConnectionState);
                NetworkChanged?.Invoke(info);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to refresh network context");
        }
    }

    public (IPAddress network, int prefixLength)? GetSubnet()
    {
        if (_current == null) return null;

        if (!IPAddress.TryParse(_current.LocalIp, out var ip)) return null;
        if (!IPAddress.TryParse(_current.SubnetMask, out var mask)) return null;

        var ipBytes = ip.GetAddressBytes();
        var maskBytes = mask.GetAddressBytes();
        var networkBytes = new byte[4];
        for (int i = 0; i < 4; i++)
            networkBytes[i] = (byte)(ipBytes[i] & maskBytes[i]);

        int prefix = 0;
        foreach (var b in maskBytes)
        {
            for (int bit = 7; bit >= 0; bit--)
            {
                if ((b & (1 << bit)) != 0) prefix++;
                else goto done;
            }
        }
        done:

        return (new IPAddress(networkBytes), prefix);
    }

    private static NetworkInterface? GetDefaultInterface()
    {
        return NetworkInterface.GetAllNetworkInterfaces()
            .Where(i => i.OperationalStatus == OperationalStatus.Up)
            .Where(i => i.NetworkInterfaceType != NetworkInterfaceType.Loopback)
            .Where(i => !IsVirtualInterface(i))
            .Where(i => i.GetIPProperties().GatewayAddresses.Count > 0)
            .OrderByDescending(i => i.Speed)
            .FirstOrDefault();
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
        // Real implementation uses Wlanapi via P/Invoke:
        // WlanOpenHandle → WlanGetAvailableNetworkList → match connected SSID
        // Stubbed for non-Windows builds
        return null;
    }
}
