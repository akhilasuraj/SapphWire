using System.Net.NetworkInformation;

namespace SapphWire.Core;

public class NetworkNameProvider
{
    private readonly INetworkAdapterEnumerator _enumerator;

    public NetworkNameProvider(INetworkAdapterEnumerator enumerator)
    {
        _enumerator = enumerator;
    }

    public string GetNetworkName()
    {
        var adapters = _enumerator.GetAdapters()
            .Where(a => a.Status == OperationalStatus.Up)
            .ToList();

        if (adapters.Count == 0)
            return "Disconnected";

        var physical = adapters.Where(a => !a.IsVirtual).ToList();

        if (physical.Count > 0)
        {
            var chosen = physical.Count > 1
                ? physical.FirstOrDefault(a => a.HasDefaultRoute) ?? physical[0]
                : physical[0];

            if (chosen.InterfaceType == NetworkInterfaceType.Wireless80211
                && !string.IsNullOrEmpty(chosen.Ssid))
                return chosen.Ssid;

            return chosen.ProfileName ?? chosen.Name;
        }

        var vpn = adapters[0];
        return $"{vpn.Name} (VPN)";
    }
}
