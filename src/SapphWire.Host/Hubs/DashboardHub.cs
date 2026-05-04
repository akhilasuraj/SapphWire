using System.Diagnostics;
using Microsoft.AspNetCore.SignalR;
using SapphWire.Core;

namespace SapphWire.Host.Hubs;

public class DashboardHub : Hub
{
    private readonly IPersistence _persistence;
    private readonly IFirewall _firewall;
    private readonly FlowAggregator _aggregator;
    private readonly DeviceTracker _deviceTracker;
    private readonly NetworkContext _networkContext;
    private readonly SubnetScanner _scanner;
    private readonly SettingsManager _settings;
    private readonly IAutostart _autostart;
    private readonly INetworkCapture _capture;

    public DashboardHub(
        IPersistence persistence,
        IFirewall firewall,
        FlowAggregator aggregator,
        DeviceTracker deviceTracker,
        NetworkContext networkContext,
        SubnetScanner scanner,
        SettingsManager settings,
        IAutostart autostart,
        INetworkCapture capture)
    {
        _persistence = persistence;
        _firewall = firewall;
        _aggregator = aggregator;
        _deviceTracker = deviceTracker;
        _networkContext = networkContext;
        _scanner = scanner;
        _settings = settings;
        _autostart = autostart;
        _capture = capture;
    }

    public async Task SubscribeAlerts()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "alerts");
        var alerts = await _persistence.GetAlertsAsync();
        await Clients.Caller.SendAsync("AlertsSnapshot", alerts);
    }

    public async Task UnsubscribeAlerts()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "alerts");
    }

    public async Task MarkAlertRead(long alertId)
    {
        await _persistence.MarkAlertReadAsync(alertId);
    }

    public async Task MarkAllAlertsRead()
    {
        await _persistence.MarkAllAlertsReadAsync();
    }

    public async Task DeleteAlert(long alertId)
    {
        await _persistence.DeleteAlertAsync(alertId);
    }

    public async Task Ping()
    {
        await Clients.Caller.SendAsync("Pong");
    }

    public async Task SubscribeLiveThroughput()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "liveThroughput");
        var snapshot = await _persistence.GetSeriesAsync(
            DateTimeOffset.UtcNow.AddSeconds(-300),
            DateTimeOffset.UtcNow,
            TimeSpan.FromSeconds(1));
        await Clients.Caller.SendAsync("ThroughputSnapshot", snapshot);
    }

    public async Task UnsubscribeLiveThroughput()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "liveThroughput");
    }

    public async Task SubscribeActiveApps()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "activeApps");
    }

    public async Task UnsubscribeActiveApps()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "activeApps");
    }

    public async Task SubscribeConnections(string appId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"connections/{appId}");
    }

    public async Task UnsubscribeConnections(string appId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"connections/{appId}");
    }

    public async Task SubscribeFirewall()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "firewall");
        var state = _firewall.GetState();
        await Clients.Caller.SendAsync("FirewallStateSnapshot", state);
    }

    public async Task UnsubscribeFirewall()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "firewall");
    }

    public async Task<IReadOnlyList<GraphSeriesPoint>> GetGraphSeries(
        string fromIso, string toIso, int bucketSeconds, string groupByStr)
    {
        var from = DateTimeOffset.Parse(fromIso);
        var to = DateTimeOffset.Parse(toIso);
        var bucketSize = TimeSpan.FromSeconds(bucketSeconds);
        var groupBy = groupByStr switch
        {
            "App" => GroupBy.App,
            "Publisher" => GroupBy.Publisher,
            _ => GroupBy.None,
        };

        return await _persistence.GetGroupedSeriesAsync(from, to, bucketSize, groupBy);
    }

    public async Task<UsageResult> GetUsage(
        string fromIso, string toIso, string groupBy, UsageFilters filters)
    {
        var from = DateTimeOffset.Parse(fromIso);
        var to = DateTimeOffset.Parse(toIso);
        return await _persistence.GetUsageAsync(from, to, groupBy, filters);
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

    // Settings channel

    public async Task SubscribeSettings()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "settings");

        var dbSize = await _persistence.GetDatabaseSizeBytesAsync();
        var snapshot = new
        {
            Settings = _settings.Current,
            DbPath = _persistence.GetDatabasePath(),
            DbSizeBytes = dbSize,
            Version = GetVersion(),
            BuildHash = GetBuildHash(),
            LogsPath = SettingsManager.GetLogsFolder(),
        };

        await Clients.Caller.SendAsync("SettingsSnapshot", snapshot);
    }

    public async Task UnsubscribeSettings()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "settings");
    }

    public async Task SetAutostart(bool enabled)
    {
        _settings.Update(s => s with { AutostartEnabled = enabled });

        if (enabled)
            _autostart.Enable();
        else
            _autostart.Disable();

        await Clients.Group("settings").SendAsync("SettingsChanged", _settings.Current);
    }

    public async Task SetToastEnabled(bool enabled)
    {
        _settings.Update(s => s with { ToastEnabled = enabled });
        await Clients.Group("settings").SendAsync("SettingsChanged", _settings.Current);
    }

    public async Task ClearData()
    {
        await _persistence.ClearDataAsync();
        var dbSize = await _persistence.GetDatabaseSizeBytesAsync();
        var snapshot = new
        {
            Settings = _settings.Current,
            DbPath = _persistence.GetDatabasePath(),
            DbSizeBytes = dbSize,
            Version = GetVersion(),
            BuildHash = GetBuildHash(),
            LogsPath = SettingsManager.GetLogsFolder(),
        };
        await Clients.Group("settings").SendAsync("SettingsSnapshot", snapshot);
    }

    public async Task PauseMonitoring()
    {
        _capture.Stop();
        await Clients.Group("settings").SendAsync("MonitoringStateChanged", true);
    }

    public async Task ResumeMonitoring()
    {
        _capture.Start();
        await Clients.Group("settings").SendAsync("MonitoringStateChanged", false);
    }

    public Task OpenDataFolder()
    {
        var folder = SettingsManager.GetDataFolder();
        if (Directory.Exists(folder))
            Process.Start("explorer.exe", folder);
        return Task.CompletedTask;
    }

    public Task ShowLogs()
    {
        var folder = SettingsManager.GetLogsFolder();
        Directory.CreateDirectory(folder);
        Process.Start("explorer.exe", folder);
        return Task.CompletedTask;
    }

    // Errors channel

    public async Task SubscribeErrors()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "errors");
    }

    public async Task UnsubscribeErrors()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "errors");
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

    private static string GetVersion()
    {
        var asm = typeof(DashboardHub).Assembly;
        var version = asm.GetName().Version;
        return version?.ToString(3) ?? "0.0.0";
    }

    private static string GetBuildHash()
    {
        var asm = typeof(DashboardHub).Assembly;
        var attr = asm.GetCustomAttributes(typeof(System.Reflection.AssemblyInformationalVersionAttribute), false)
            .OfType<System.Reflection.AssemblyInformationalVersionAttribute>()
            .FirstOrDefault();
        if (attr?.InformationalVersion is { } info)
        {
            var plusIndex = info.IndexOf('+');
            if (plusIndex >= 0 && plusIndex + 1 < info.Length)
                return info[(plusIndex + 1)..];
        }
        return "dev";
    }
}
