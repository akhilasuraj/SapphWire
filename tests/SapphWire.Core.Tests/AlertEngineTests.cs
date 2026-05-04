using FluentAssertions;
using SapphWire.Core;

namespace SapphWire.Core.Tests;

public class AlertEngineTests
{
    private static ProcessInfo MakeProcess(string exeName = "app.exe", string? productName = "TestApp", string? exePath = null) =>
        new(
            ExeName: exeName,
            ExePath: exePath ?? $"C:\\Program Files\\{productName}\\{exeName}",
            ProductName: productName ?? "",
            FileDescription: "",
            Publisher: "TestPublisher"
        );

    private static FlowKey MakeFlow(int pid = 1, string ip = "8.8.8.8", int port = 443) =>
        new(pid, ip, port);

    [Fact]
    public void Evaluate_FirstExternalConnection_EmitsAlert()
    {
        var engine = new AlertEngine(Array.Empty<string>());
        var flow = MakeFlow();
        var proc = MakeProcess();
        var ts = DateTimeOffset.UtcNow;

        var alert = engine.Evaluate(flow, proc, ts);

        alert.Should().NotBeNull();
        alert!.AppName.Should().Be("TestApp");
        alert.RemoteIp.Should().Be("8.8.8.8");
        alert.RemotePort.Should().Be(443);
        alert.Timestamp.Should().Be(ts);
        alert.IsRead.Should().BeFalse();
    }

    [Fact]
    public void Evaluate_SameAppSecondTime_DoesNotReAlert()
    {
        var engine = new AlertEngine(Array.Empty<string>());
        var flow = MakeFlow();
        var proc = MakeProcess();
        var ts = DateTimeOffset.UtcNow;

        engine.Evaluate(flow, proc, ts);
        var second = engine.Evaluate(MakeFlow(pid: 2), proc, ts.AddSeconds(1));

        second.Should().BeNull();
    }

    [Fact]
    public void Evaluate_AlreadySeenApp_DoesNotAlert()
    {
        var engine = new AlertEngine(new[] { "TestApp" });
        var flow = MakeFlow();
        var proc = MakeProcess();

        var alert = engine.Evaluate(flow, proc, DateTimeOffset.UtcNow);

        alert.Should().BeNull();
    }

    [Fact]
    public void Evaluate_LoopbackIpv4_Skipped()
    {
        var engine = new AlertEngine(Array.Empty<string>());
        var flow = MakeFlow(ip: "127.0.0.1");
        var proc = MakeProcess();

        var alert = engine.Evaluate(flow, proc, DateTimeOffset.UtcNow);

        alert.Should().BeNull();
    }

    [Fact]
    public void Evaluate_LoopbackIpv4OtherSubnet_Skipped()
    {
        var engine = new AlertEngine(Array.Empty<string>());
        var flow = MakeFlow(ip: "127.5.3.1");
        var proc = MakeProcess();

        var alert = engine.Evaluate(flow, proc, DateTimeOffset.UtcNow);

        alert.Should().BeNull();
    }

    [Fact]
    public void Evaluate_LoopbackIpv6_Skipped()
    {
        var engine = new AlertEngine(Array.Empty<string>());
        var flow = MakeFlow(ip: "::1");
        var proc = MakeProcess();

        var alert = engine.Evaluate(flow, proc, DateTimeOffset.UtcNow);

        alert.Should().BeNull();
    }

    [Fact]
    public void Evaluate_LinkLocalIpv4_Skipped()
    {
        var engine = new AlertEngine(Array.Empty<string>());
        var flow = MakeFlow(ip: "169.254.1.1");
        var proc = MakeProcess();

        var alert = engine.Evaluate(flow, proc, DateTimeOffset.UtcNow);

        alert.Should().BeNull();
    }

    [Fact]
    public void Evaluate_LinkLocalIpv6_Skipped()
    {
        var engine = new AlertEngine(Array.Empty<string>());
        var flow = MakeFlow(ip: "fe80::1");
        var proc = MakeProcess();

        var alert = engine.Evaluate(flow, proc, DateTimeOffset.UtcNow);

        alert.Should().BeNull();
    }

    [Fact]
    public void Evaluate_Rfc1918PrivateIp_Triggers()
    {
        var engine = new AlertEngine(Array.Empty<string>());

        var alert10 = engine.Evaluate(MakeFlow(ip: "10.0.0.1"), MakeProcess(productName: "App1"), DateTimeOffset.UtcNow);
        var alert172 = engine.Evaluate(MakeFlow(ip: "172.16.5.1"), MakeProcess(productName: "App2"), DateTimeOffset.UtcNow);
        var alert192 = engine.Evaluate(MakeFlow(ip: "192.168.1.1"), MakeProcess(productName: "App3"), DateTimeOffset.UtcNow);

        alert10.Should().NotBeNull();
        alert172.Should().NotBeNull();
        alert192.Should().NotBeNull();
    }

    [Fact]
    public void Evaluate_ChildOfAlreadyConnectedParent_Suppressed()
    {
        var engine = new AlertEngine(Array.Empty<string>());
        var parentProc = MakeProcess(exeName: "chrome.exe", productName: "Google Chrome", exePath: "C:\\Program Files\\Google Chrome\\chrome.exe");
        var childProc = MakeProcess(exeName: "chrome_helper.exe", productName: "Google Chrome", exePath: "C:\\Program Files\\Google Chrome\\chrome_helper.exe");

        var first = engine.Evaluate(MakeFlow(pid: 1), parentProc, DateTimeOffset.UtcNow);
        var child = engine.Evaluate(MakeFlow(pid: 2, ip: "1.2.3.4"), childProc, DateTimeOffset.UtcNow.AddSeconds(1));

        first.Should().NotBeNull();
        child.Should().BeNull();
    }

    [Fact]
    public void Evaluate_DifferentApps_EachFiresOnce()
    {
        var engine = new AlertEngine(Array.Empty<string>());
        var ts = DateTimeOffset.UtcNow;

        var alert1 = engine.Evaluate(MakeFlow(pid: 1), MakeProcess(productName: "App1"), ts);
        var alert2 = engine.Evaluate(MakeFlow(pid: 2), MakeProcess(productName: "App2"), ts.AddSeconds(1));
        var alert3 = engine.Evaluate(MakeFlow(pid: 3), MakeProcess(productName: "App3"), ts.AddSeconds(2));

        alert1.Should().NotBeNull();
        alert2.Should().NotBeNull();
        alert3.Should().NotBeNull();
        alert1!.AppName.Should().Be("App1");
        alert2!.AppName.Should().Be("App2");
        alert3!.AppName.Should().Be("App3");
    }

    [Fact]
    public void Evaluate_OrderedByTimestamp()
    {
        var engine = new AlertEngine(Array.Empty<string>());
        var t1 = DateTimeOffset.Parse("2024-01-01T00:00:00Z");
        var t2 = DateTimeOffset.Parse("2024-01-01T00:01:00Z");
        var t3 = DateTimeOffset.Parse("2024-01-01T00:02:00Z");

        var a1 = engine.Evaluate(MakeFlow(pid: 1), MakeProcess(productName: "Zebra"), t1);
        var a2 = engine.Evaluate(MakeFlow(pid: 2), MakeProcess(productName: "Apple"), t2);
        var a3 = engine.Evaluate(MakeFlow(pid: 3), MakeProcess(productName: "Mango"), t3);

        var alerts = new[] { a1!, a2!, a3! };
        alerts.Should().BeInAscendingOrder(a => a.Timestamp);
    }

    [Fact]
    public void IsExcluded_EmptyIp_ReturnsTrue()
    {
        AlertEngine.IsExcluded("").Should().BeTrue();
    }

    [Fact]
    public void IsExcluded_PublicIp_ReturnsFalse()
    {
        AlertEngine.IsExcluded("8.8.8.8").Should().BeFalse();
        AlertEngine.IsExcluded("1.1.1.1").Should().BeFalse();
        AlertEngine.IsExcluded("203.0.113.1").Should().BeFalse();
    }
}
