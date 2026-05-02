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

    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Pong");
        await base.OnConnectedAsync();
    }
}
