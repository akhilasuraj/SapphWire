using SapphWire.Core;
using SapphWire.Host.Hubs;
using SapphWire.Host.Services;
using SapphWire.Host.Tray;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls(HostInfo.BaseUrl);

builder.Services.AddSignalR();
builder.Services.AddSingleton<IBrowserLauncher, BrowserLauncher>();
builder.Services.AddSingleton<TrayManager>();
builder.Services.AddSingleton<FlowAggregator>();
builder.Services.AddSingleton<INetworkCapture, EtwNetworkCapture>();
builder.Services.AddHostedService<CaptureHostedService>();
builder.Services.AddHostedService<ThroughputPublisher>();

// Things tab services
builder.Services.AddSingleton<OuiDatabase>();
builder.Services.AddSingleton<NetworkContext>();
builder.Services.AddSingleton<DeviceTracker>(sp =>
    new DeviceTracker(sp.GetRequiredService<OuiDatabase>()));
builder.Services.AddSingleton<SubnetScanner>();
builder.Services.AddSingleton<IDiscoverySource, ArpDiscovery>();
builder.Services.AddSingleton<IDiscoverySource, MdnsDiscovery>();
builder.Services.AddSingleton<IDiscoverySource, SsdpDiscovery>();
builder.Services.AddHostedService<DiscoveryService>();
builder.Services.AddHostedService<ThingsPublisher>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapHub<DashboardHub>(HostInfo.HubPath);

app.Lifetime.ApplicationStarted.Register(() =>
{
    var tray = app.Services.GetRequiredService<TrayManager>();
    tray.Initialize();
    tray.OpenDashboard();

    // Initialize network context on startup
    var networkContext = app.Services.GetRequiredService<NetworkContext>();
    networkContext.Refresh();
});

app.Run();
