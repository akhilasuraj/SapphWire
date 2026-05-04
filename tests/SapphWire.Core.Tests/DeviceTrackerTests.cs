using FluentAssertions;
using SapphWire.Core;

namespace SapphWire.Core.Tests;

public class DeviceTrackerTests
{
    private static DeviceTracker CreateTracker()
    {
        var oui = new OuiDatabase();
        using var reader = new StringReader("AABBCC,\"TestVendor\"");
        oui.LoadFromCsv(reader);
        return new DeviceTracker(oui);
    }

    [Fact]
    public void Upsert_AddsNewDevice()
    {
        var tracker = CreateTracker();
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.1", "host1", "net1");

        var devices = tracker.GetDevices();
        devices.Should().HaveCount(1);
        devices[0].Mac.Should().Be("AA:BB:CC:DD:EE:FF");
        devices[0].Ip.Should().Be("192.168.1.1");
        devices[0].Hostname.Should().Be("host1");
        devices[0].Vendor.Should().Be("TestVendor");
    }

    [Fact]
    public void Upsert_UpdatesExistingDevice()
    {
        var tracker = CreateTracker();
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.1", "host1", "net1");
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.2", "host2", "net1");

        var devices = tracker.GetDevices();
        devices.Should().HaveCount(1);
        devices[0].Ip.Should().Be("192.168.1.2");
        devices[0].Hostname.Should().Be("host2");
    }

    [Fact]
    public void Upsert_KeepsExistingFieldsWhenNewValuesAreEmpty()
    {
        var tracker = CreateTracker();
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.1", "host1", "net1");
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "", "", "net1");

        var devices = tracker.GetDevices();
        devices[0].Ip.Should().Be("192.168.1.1");
        devices[0].Hostname.Should().Be("host1");
    }

    [Fact]
    public void Upsert_FiresDeviceUpdatedEvent()
    {
        var tracker = CreateTracker();
        DiscoveredDevice? updated = null;
        tracker.DeviceUpdated += d => updated = d;

        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.1", "host1", "net1");

        updated.Should().NotBeNull();
        updated!.Mac.Should().Be("AA:BB:CC:DD:EE:FF");
    }

    [Fact]
    public void SetFriendlyName_SetsName()
    {
        var tracker = CreateTracker();
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.1", "host1", "net1");
        tracker.SetFriendlyName("AA:BB:CC:DD:EE:FF", "Living Room TV");

        var devices = tracker.GetDevices();
        devices[0].FriendlyName.Should().Be("Living Room TV");
    }

    [Fact]
    public void SetFriendlyName_ClearsNameWhenEmpty()
    {
        var tracker = CreateTracker();
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.1", "host1", "net1");
        tracker.SetFriendlyName("AA:BB:CC:DD:EE:FF", "My Device");
        tracker.SetFriendlyName("AA:BB:CC:DD:EE:FF", "");

        var devices = tracker.GetDevices();
        devices[0].FriendlyName.Should().BeNull();
    }

    [Fact]
    public void TogglePin_TogglesState()
    {
        var tracker = CreateTracker();
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.1", "host1", "net1");

        tracker.TogglePin("AA:BB:CC:DD:EE:FF");
        tracker.GetDevices()[0].Pinned.Should().BeTrue();

        tracker.TogglePin("AA:BB:CC:DD:EE:FF");
        tracker.GetDevices()[0].Pinned.Should().BeFalse();
    }

    [Fact]
    public void Forget_RemovesDevice()
    {
        var tracker = CreateTracker();
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.1", "host1", "net1");
        tracker.Forget("AA:BB:CC:DD:EE:FF");

        tracker.GetDevices().Should().BeEmpty();
    }

    [Fact]
    public void Forget_FiresDeviceRemovedEvent()
    {
        var tracker = CreateTracker();
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.1", "host1", "net1");

        string? removedMac = null;
        tracker.DeviceRemoved += mac => removedMac = mac;
        tracker.Forget("AA:BB:CC:DD:EE:FF");

        removedMac.Should().Be("AA:BB:CC:DD:EE:FF");
    }

    [Fact]
    public void GetDevices_FiltersByNetworkId()
    {
        var tracker = CreateTracker();
        tracker.Upsert("AA:BB:CC:DD:EE:01", "192.168.1.1", "h1", "net1");
        tracker.Upsert("AA:BB:CC:DD:EE:02", "192.168.2.1", "h2", "net2");

        var net1Devices = tracker.GetDevices("net1");
        net1Devices.Should().HaveCount(1);
        net1Devices[0].NetworkId.Should().Be("net1");
    }

    [Fact]
    public void Upsert_SetsIsThisPcAndIsGateway()
    {
        var tracker = CreateTracker();
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.50", "my-pc", "net1",
            isThisPc: true);
        tracker.Upsert("AA:BB:CC:DD:EE:01", "192.168.1.1", "router", "net1",
            isGateway: true);

        var devices = tracker.GetDevices();
        devices.First(d => d.IsThisPc).Hostname.Should().Be("my-pc");
        devices.First(d => d.IsGateway).Hostname.Should().Be("router");
    }

    [Fact]
    public void Upsert_DoesNotOverrideIsThisPcWithFalse()
    {
        var tracker = CreateTracker();
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.50", "my-pc", "net1",
            isThisPc: true);
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.50", "my-pc", "net1",
            isThisPc: false);

        tracker.GetDevices()[0].IsThisPc.Should().BeTrue();
    }

    [Fact]
    public void GetSnapshot_ReturnsSerializableObjects()
    {
        var tracker = CreateTracker();
        tracker.Upsert("AA:BB:CC:DD:EE:FF", "192.168.1.1", "host1", "net1");

        var snapshot = tracker.GetSnapshot();
        snapshot.Should().HaveCount(1);
    }
}
