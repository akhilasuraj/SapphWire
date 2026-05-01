using SapphWire.Core;
using SapphWire.Host.Hubs;
using SapphWire.Host.Tray;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls(HostInfo.BaseUrl);

builder.Services.AddSignalR();
builder.Services.AddSingleton<IBrowserLauncher, BrowserLauncher>();
builder.Services.AddSingleton<TrayManager>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapHub<DashboardHub>(HostInfo.HubPath);

app.Lifetime.ApplicationStarted.Register(() =>
{
    var tray = app.Services.GetRequiredService<TrayManager>();
    tray.Initialize();
    tray.OpenDashboard();
});

app.Run();
