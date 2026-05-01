using FluentAssertions;

namespace SapphWire.Core.Tests;

public class HostInfoTests
{
    [Fact]
    public void Port_ShouldBeFixedValue()
    {
        HostInfo.Port.Should().Be(5148);
    }

    [Fact]
    public void BaseUrl_ShouldContainPort()
    {
        HostInfo.BaseUrl.Should().Be("http://localhost:5148");
    }

    [Fact]
    public void DashboardUrl_ShouldEqualBaseUrl()
    {
        HostInfo.DashboardUrl.Should().Be(HostInfo.BaseUrl);
    }

    [Fact]
    public void HubPath_ShouldBeHubsDashboard()
    {
        HostInfo.HubPath.Should().Be("/hubs/dashboard");
    }
}
