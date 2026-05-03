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
builder.Services.AddSingleton<IProcessSource, WindowsProcessSource>();
builder.Services.AddSingleton<IProcessResolver, ProcessResolver>();
builder.Services.AddSingleton<IDnsResolver, PassthroughDnsResolver>();
builder.Services.AddSingleton<IGeoIp, NullGeoIp>();
builder.Services.AddSingleton<IPersistence>(
    _ => new SqlitePersistence(SqlitePersistence.GetDefaultConnectionString()));
builder.Services.AddHostedService<CaptureHostedService>();
builder.Services.AddHostedService<ThroughputPublisher>();
builder.Services.AddHostedService<RollupService>();

var app = builder.Build();

await app.Services.GetRequiredService<IPersistence>().InitializeAsync();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapHub<DashboardHub>(HostInfo.HubPath);

app.Lifetime.ApplicationStarted.Register(() =>
{
    var tray = app.Services.GetRequiredService<TrayManager>();
    tray.Initialize();
    tray.OpenDashboard();
});

await app.RunAsync();
