using FluentAssertions;
using SapphWire.Core;

namespace SapphWire.Core.Tests;

public class ScopeClassifierTests
{
    private static readonly IReadOnlyList<HostSubnet> NoSubnets = Array.Empty<HostSubnet>();

    // --- RFC1918: 10.0.0.0/8 ---

    [Theory]
    [InlineData("10.0.0.1")]
    [InlineData("10.255.255.255")]
    [InlineData("10.0.0.0")]
    [InlineData("10.123.45.67")]
    public void Classify_Rfc1918_10Network_ReturnsLan(string ip)
    {
        ScopeClassifier.Classify(ip, NoSubnets).Should().Be(NetworkScope.Lan);
    }

    // --- RFC1918: 172.16.0.0/12 ---

    [Theory]
    [InlineData("172.16.0.1")]
    [InlineData("172.31.255.255")]
    [InlineData("172.20.10.5")]
    [InlineData("172.16.0.0")]
    public void Classify_Rfc1918_172Network_ReturnsLan(string ip)
    {
        ScopeClassifier.Classify(ip, NoSubnets).Should().Be(NetworkScope.Lan);
    }

    [Theory]
    [InlineData("172.15.255.255")]
    [InlineData("172.32.0.0")]
    public void Classify_172OutsideRfc1918_ReturnsWan(string ip)
    {
        ScopeClassifier.Classify(ip, NoSubnets).Should().Be(NetworkScope.Wan);
    }

    // --- RFC1918: 192.168.0.0/16 ---

    [Theory]
    [InlineData("192.168.0.1")]
    [InlineData("192.168.255.255")]
    [InlineData("192.168.1.100")]
    [InlineData("192.168.0.0")]
    public void Classify_Rfc1918_192Network_ReturnsLan(string ip)
    {
        ScopeClassifier.Classify(ip, NoSubnets).Should().Be(NetworkScope.Lan);
    }

    // --- Link-local: 169.254.0.0/16 ---

    [Theory]
    [InlineData("169.254.0.1")]
    [InlineData("169.254.255.255")]
    [InlineData("169.254.100.50")]
    public void Classify_LinkLocal_ReturnsLan(string ip)
    {
        ScopeClassifier.Classify(ip, NoSubnets).Should().Be(NetworkScope.Lan);
    }

    // --- Loopback: 127.0.0.0/8 ---

    [Theory]
    [InlineData("127.0.0.1")]
    [InlineData("127.255.255.255")]
    public void Classify_Loopback_ReturnsLan(string ip)
    {
        ScopeClassifier.Classify(ip, NoSubnets).Should().Be(NetworkScope.Lan);
    }

    // --- Public / WAN IPs ---

    [Theory]
    [InlineData("8.8.8.8")]
    [InlineData("1.1.1.1")]
    [InlineData("142.250.80.46")]
    [InlineData("203.0.113.1")]
    [InlineData("52.84.125.100")]
    public void Classify_PublicIp_ReturnsWan(string ip)
    {
        ScopeClassifier.Classify(ip, NoSubnets).Should().Be(NetworkScope.Wan);
    }

    // --- Same-subnet-as-host ---

    [Fact]
    public void Classify_SameSubnetAsHost_24Prefix_ReturnsLan()
    {
        var subnets = new[] { new HostSubnet("50.50.50.100", "255.255.255.0") };
        ScopeClassifier.Classify("50.50.50.42", subnets).Should().Be(NetworkScope.Lan);
    }

    [Fact]
    public void Classify_DifferentSubnetFromHost_24Prefix_ReturnsWan()
    {
        var subnets = new[] { new HostSubnet("50.50.50.100", "255.255.255.0") };
        ScopeClassifier.Classify("50.50.51.1", subnets).Should().Be(NetworkScope.Wan);
    }

    [Fact]
    public void Classify_SameSubnetAsHost_16Prefix_ReturnsLan()
    {
        var subnets = new[] { new HostSubnet("50.50.1.100", "255.255.0.0") };
        ScopeClassifier.Classify("50.50.200.1", subnets).Should().Be(NetworkScope.Lan);
    }

    [Fact]
    public void Classify_MultipleHostInterfaces_MatchesAny()
    {
        var subnets = new[]
        {
            new HostSubnet("192.168.1.10", "255.255.255.0"),
            new HostSubnet("50.50.50.100", "255.255.255.0"),
        };
        ScopeClassifier.Classify("50.50.50.42", subnets).Should().Be(NetworkScope.Lan);
    }

    // --- Boundary / edge cases ---

    [Fact]
    public void Classify_InvalidIpString_ReturnsWan()
    {
        ScopeClassifier.Classify("not-an-ip", NoSubnets).Should().Be(NetworkScope.Wan);
    }

    [Fact]
    public void Classify_EmptyString_ReturnsWan()
    {
        ScopeClassifier.Classify("", NoSubnets).Should().Be(NetworkScope.Wan);
    }

    [Fact]
    public void Classify_IPv6Loopback_ReturnsWan()
    {
        ScopeClassifier.Classify("::1", NoSubnets).Should().Be(NetworkScope.Wan);
    }

    [Fact]
    public void Classify_Rfc1918BoundaryLow_10_0_0_0_ReturnsLan()
    {
        ScopeClassifier.Classify("10.0.0.0", NoSubnets).Should().Be(NetworkScope.Lan);
    }

    [Fact]
    public void Classify_Rfc1918BoundaryHigh_10_255_255_255_ReturnsLan()
    {
        ScopeClassifier.Classify("10.255.255.255", NoSubnets).Should().Be(NetworkScope.Lan);
    }

    [Fact]
    public void Classify_JustBelow172Range_ReturnsWan()
    {
        ScopeClassifier.Classify("172.15.255.255", NoSubnets).Should().Be(NetworkScope.Wan);
    }

    [Fact]
    public void Classify_JustAbove172Range_ReturnsWan()
    {
        ScopeClassifier.Classify("172.32.0.0", NoSubnets).Should().Be(NetworkScope.Wan);
    }

    [Fact]
    public void Classify_HostSubnetWithInvalidMask_IgnoresSubnet()
    {
        var subnets = new[] { new HostSubnet("50.50.50.100", "invalid") };
        ScopeClassifier.Classify("50.50.50.42", subnets).Should().Be(NetworkScope.Wan);
    }

    [Fact]
    public void Classify_HostSubnetWithInvalidIp_IgnoresSubnet()
    {
        var subnets = new[] { new HostSubnet("invalid", "255.255.255.0") };
        ScopeClassifier.Classify("50.50.50.42", subnets).Should().Be(NetworkScope.Wan);
    }
}
