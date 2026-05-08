using System.Net.NetworkInformation;
using FluentAssertions;
using NSubstitute;
using SapphWire.Core;

namespace SapphWire.Core.Tests;

public class NetworkNameProviderTests
{
    private readonly INetworkAdapterEnumerator _enumerator = Substitute.For<INetworkAdapterEnumerator>();

    private NetworkNameProvider CreateProvider() => new(_enumerator);

    private static AdapterInfo Wifi(string ssid, bool defaultRoute = false) => new(
        Name: "Wi-Fi",
        InterfaceType: NetworkInterfaceType.Wireless80211,
        Status: OperationalStatus.Up,
        HasDefaultRoute: defaultRoute,
        IsVirtual: false,
        Ssid: ssid,
        ProfileName: null
    );

    private static AdapterInfo Ethernet(string profileName, bool defaultRoute = false) => new(
        Name: "Ethernet",
        InterfaceType: NetworkInterfaceType.Ethernet,
        Status: OperationalStatus.Up,
        HasDefaultRoute: defaultRoute,
        IsVirtual: false,
        Ssid: null,
        ProfileName: profileName
    );

    private static AdapterInfo Vpn(string name) => new(
        Name: name,
        InterfaceType: NetworkInterfaceType.Tunnel,
        Status: OperationalStatus.Up,
        HasDefaultRoute: false,
        IsVirtual: true,
        Ssid: null,
        ProfileName: null
    );

    [Fact]
    public void WifiConnected_ReturnsSsid()
    {
        _enumerator.GetAdapters().Returns(new[] { Wifi("Falcon Boost") });

        CreateProvider().GetNetworkName().Should().Be("Falcon Boost");
    }

    [Fact]
    public void EthernetOnly_ReturnsProfileName()
    {
        _enumerator.GetAdapters().Returns(new[] { Ethernet("Office LAN") });

        CreateProvider().GetNetworkName().Should().Be("Office LAN");
    }

    [Fact]
    public void VpnOnly_ReturnsNameWithSuffix()
    {
        _enumerator.GetAdapters().Returns(new[] { Vpn("Cloudflare WARP") });

        CreateProvider().GetNetworkName().Should().Be("Cloudflare WARP (VPN)");
    }

    [Fact]
    public void NoAdaptersUp_ReturnsDisconnected()
    {
        _enumerator.GetAdapters().Returns(Array.Empty<AdapterInfo>());

        CreateProvider().GetNetworkName().Should().Be("Disconnected");
    }

    [Fact]
    public void AllAdaptersDown_ReturnsDisconnected()
    {
        var down = new AdapterInfo(
            "Wi-Fi", NetworkInterfaceType.Wireless80211,
            OperationalStatus.Down, false, false, null, null);
        _enumerator.GetAdapters().Returns(new[] { down });

        CreateProvider().GetNetworkName().Should().Be("Disconnected");
    }

    [Fact]
    public void MultiplePhysical_DefaultRouteWins_Wifi()
    {
        _enumerator.GetAdapters().Returns(new[]
        {
            Ethernet("Office LAN", defaultRoute: false),
            Wifi("Falcon Boost", defaultRoute: true),
        });

        CreateProvider().GetNetworkName().Should().Be("Falcon Boost");
    }

    [Fact]
    public void MultiplePhysical_DefaultRouteWins_Ethernet()
    {
        _enumerator.GetAdapters().Returns(new[]
        {
            Wifi("Falcon Boost", defaultRoute: false),
            Ethernet("Office LAN", defaultRoute: true),
        });

        CreateProvider().GetNetworkName().Should().Be("Office LAN");
    }

    [Fact]
    public void WifiWithoutSsid_FallsBackToAdapterName()
    {
        var wifi = new AdapterInfo(
            "Wi-Fi", NetworkInterfaceType.Wireless80211,
            OperationalStatus.Up, false, false, null, null);
        _enumerator.GetAdapters().Returns(new[] { wifi });

        CreateProvider().GetNetworkName().Should().Be("Wi-Fi");
    }

    [Fact]
    public void WifiAndVpn_WifiWins()
    {
        _enumerator.GetAdapters().Returns(new[]
        {
            Wifi("Home Network"),
            Vpn("NordVPN"),
        });

        CreateProvider().GetNetworkName().Should().Be("Home Network");
    }

    [Fact]
    public void EthernetAndVpn_EthernetWins()
    {
        _enumerator.GetAdapters().Returns(new[]
        {
            Ethernet("Home Ethernet"),
            Vpn("WireGuard"),
        });

        CreateProvider().GetNetworkName().Should().Be("Home Ethernet");
    }

    [Fact]
    public void EthernetWithoutProfileName_FallsBackToAdapterName()
    {
        var eth = new AdapterInfo(
            "Ethernet 2", NetworkInterfaceType.Ethernet,
            OperationalStatus.Up, false, false, null, null);
        _enumerator.GetAdapters().Returns(new[] { eth });

        CreateProvider().GetNetworkName().Should().Be("Ethernet 2");
    }

    [Fact]
    public void MultiplePhysical_NoDefaultRoute_FirstPhysicalWins()
    {
        _enumerator.GetAdapters().Returns(new[]
        {
            Wifi("First Wifi", defaultRoute: false),
            Ethernet("Second Eth", defaultRoute: false),
        });

        CreateProvider().GetNetworkName().Should().Be("First Wifi");
    }
}
