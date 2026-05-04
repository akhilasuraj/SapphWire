using Microsoft.AspNetCore.SignalR;
using SapphWire.Core;

namespace SapphWire.Host.Hubs;

public class DashboardHub : Hub
{
    private readonly FlowAggregator _aggregator;
    private readonly DeviceTracker _deviceTracker;
    private readonly NetworkContext _networkContext;
    private readonly SubnetScanner _scanner;

    public DashboardHub(
        FlowAggregator aggregator,
        DeviceTracker deviceTracker,
        NetworkContext networkContext,
        SubnetScanner scanner)
    {
        _aggregator = aggregator;
        _deviceTracker = deviceTracker;
        _networkContext = networkContext;
        _scanner = scanner;
    }

    public async Task Ping()
    {
        await Clients.Caller.SendAsync("Pong");
    }

    public async Task SubscribeLiveThroughput()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "liveThroughput");
        var snapshot = _aggregator.GetSnapshot();
        await Clients.Caller.SendAsync("ThroughputSnapshot", snapshot);
    }

    public async Task UnsubscribeLiveThroughput()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "liveThroughput");
    }

    public async Task SubscribeThings()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "things");

        var networkInfo = _networkContext.Current;
        var networkId = networkInfo?.GatewayMac;
        var devices = _deviceTracker.GetSnapshot(networkId);

        var snapshot = new
        {
            Devices = devices,
            NetworkInfo = networkInfo != null ? new
            {
                networkInfo.Ssid,
                networkInfo.ConnectionState,
                networkInfo.GatewayIp,
                networkInfo.DnsServers,
                networkInfo.LocalIp,
                networkInfo.SubnetMask,
            } : (object?)null,
            Scanning = _scanner.IsScanning,
            LastScanTime = (string?)null,
        };

        await Clients.Caller.SendAsync("ThingsSnapshot", snapshot);
    }

    public async Task UnsubscribeThings()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "things");
    }

    public async Task StartScan()
    {
        if (_scanner.IsScanning) return;

        _scanner.ProgressChanged += OnScanProgress;
        _scanner.ScanComplete += OnScanComplete;

        _ = _scanner.ScanAsync().ContinueWith(_ =>
        {
            _scanner.ProgressChanged -= OnScanProgress;
            _scanner.ScanComplete -= OnScanComplete;
        });

        await Clients.Group("things").SendAsync("ScanProgress", new
        {
            Scanning = true,
            Progress = 0,
            LastScanTime = (string?)null,
        });
    }

    public Task SetFriendlyName(string mac, string name)
    {
        _deviceTracker.SetFriendlyName(mac, name);
        return Task.CompletedTask;
    }

    public Task TogglePin(string mac)
    {
        _deviceTracker.TogglePin(mac);
        return Task.CompletedTask;
    }

    public Task ForgetDevice(string mac)
    {
        _deviceTracker.Forget(mac);
        return Task.CompletedTask;
    }

    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Pong");
        await base.OnConnectedAsync();
    }

    private async void OnScanProgress(int progress)
    {
        try
        {
            await Clients.Group("things").SendAsync("ScanProgress", new
            {
                Scanning = true,
                Progress = progress,
                LastScanTime = (string?)null,
            });
        }
        catch { }
    }

    private async void OnScanComplete()
    {
        try
        {
            await Clients.Group("things").SendAsync("ScanProgress", new
            {
                Scanning = false,
                Progress = 100,
                LastScanTime = DateTimeOffset.UtcNow.ToString("o"),
            });
        }
        catch { }
    }
}
