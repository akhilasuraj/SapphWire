using FluentAssertions;
using NSubstitute;

namespace SapphWire.Core.Tests;

public class BrowserLauncherTests
{
    [Fact]
    public void BrowserLauncher_ShouldImplementIBrowserLauncher()
    {
        var launcher = new BrowserLauncher();
        launcher.Should().BeAssignableTo<IBrowserLauncher>();
    }

    [Fact]
    public void MockBrowserLauncher_ShouldRecordOpenUrlCall()
    {
        var mock = Substitute.For<IBrowserLauncher>();

        mock.OpenUrl("http://localhost:5148");

        mock.Received(1).OpenUrl("http://localhost:5148");
    }
}
