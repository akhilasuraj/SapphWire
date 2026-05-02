using Microsoft.AspNetCore.SignalR;
using SapphWire.Core;

namespace SapphWire.Host.Hubs;

public class DashboardHub : Hub
{
    private readonly FlowAggregator _aggregator;

    public DashboardHub(FlowAggregator aggregator)
    {
        _aggregator = aggregator;
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

    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Pong");
        await base.OnConnectedAsync();
    }
}
