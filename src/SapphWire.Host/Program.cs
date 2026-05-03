using Microsoft.AspNetCore.SignalR;
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
builder.Services.AddSingleton<IFirewall, WindowsFirewall>();
builder.Services.AddSingleton<IInstalledAppsProvider, WindowsInstalledAppsProvider>();
builder.Services.AddHostedService<CaptureHostedService>();
builder.Services.AddHostedService<ThroughputPublisher>();
builder.Services.AddHostedService<RollupService>();

var app = builder.Build();

await app.Services.GetRequiredService<IPersistence>().InitializeAsync();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapHub<DashboardHub>(HostInfo.HubPath);

app.MapGet("/api/firewall/state", (IFirewall fw) => fw.GetState());

app.MapPost("/api/firewall/block", async (
    HttpContext ctx,
    IFirewall fw,
    IHubContext<DashboardHub> hub,
    IPersistence persistence,
    IProcessResolver processResolver,
    FlowAggregator aggregator) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<FirewallBlockRequest>();
    if (body == null || string.IsNullOrEmpty(body.AppId))
        return Results.BadRequest("appId is required");

    try
    {
        if (!string.IsNullOrEmpty(body.ExePath))
        {
            fw.BlockExe(body.AppId, body.ExePath);
        }
        else
        {
            var perFlow = aggregator.PeekPerFlow();
            var exePaths = perFlow.Keys
                .Select(k => processResolver.Resolve(k.Pid))
                .Where(info => string.Equals(
                    AppGrouper.GetAppKey(info), body.AppId, StringComparison.OrdinalIgnoreCase))
                .Select(info => info.ExePath)
                .Where(p => !string.IsNullOrEmpty(p))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            fw.BlockApp(body.AppId, exePaths);
            await persistence.SaveBlockedParentAsync(body.AppId);
        }

        var state = fw.GetState();
        await hub.Clients.Group("firewall").SendAsync("FirewallStateChanged", state);
        return Results.Ok(state);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/api/firewall/unblock", async (
    HttpContext ctx,
    IFirewall fw,
    IHubContext<DashboardHub> hub,
    IPersistence persistence) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<FirewallBlockRequest>();
    if (body == null || string.IsNullOrEmpty(body.AppId))
        return Results.BadRequest("appId is required");

    try
    {
        if (!string.IsNullOrEmpty(body.ExePath))
        {
            fw.UnblockExe(body.AppId, body.ExePath);
        }
        else
        {
            fw.UnblockApp(body.AppId);
            await persistence.RemoveBlockedParentAsync(body.AppId);
        }

        var state = fw.GetState();
        await hub.Clients.Group("firewall").SendAsync("FirewallStateChanged", state);
        return Results.Ok(state);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/firewall/installed-apps", (IInstalledAppsProvider provider) =>
    provider.GetInstalledApps());

app.Lifetime.ApplicationStarted.Register(() =>
{
    var tray = app.Services.GetRequiredService<TrayManager>();
    tray.Initialize();
    tray.OpenDashboard();
});

await app.RunAsync();

record FirewallBlockRequest(string AppId, string? ExePath = null);
