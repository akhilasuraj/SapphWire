using Microsoft.AspNetCore.SignalR;

namespace SapphWire.Host.Hubs;

public class DashboardHub : Hub
{
    public async Task Ping()
    {
        await Clients.Caller.SendAsync("Pong");
    }

    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Pong");
        await base.OnConnectedAsync();
    }
}
