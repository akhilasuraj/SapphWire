using Microsoft.AspNetCore.SignalR;
using SapphWire.Core;

namespace SapphWire.Host.Hubs;

public class DashboardHub : Hub
{
    private readonly IPersistence _persistence;

    public DashboardHub(IPersistence persistence)
    {
        _persistence = persistence;
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

    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Pong");
        await base.OnConnectedAsync();
    }
}
