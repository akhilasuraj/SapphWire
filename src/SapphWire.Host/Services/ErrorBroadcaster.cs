using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using SapphWire.Host.Hubs;

namespace SapphWire.Host.Services;

public class ErrorBroadcaster
{
    private readonly IHubContext<DashboardHub> _hub;
    private readonly ILogger<ErrorBroadcaster> _logger;
    private int _errorCounter;

    public ErrorBroadcaster(IHubContext<DashboardHub> hub, ILogger<ErrorBroadcaster> logger)
    {
        _hub = hub;
        _logger = logger;
    }

    public async Task BroadcastError(string message)
    {
        var id = $"err-{Interlocked.Increment(ref _errorCounter)}";
        var error = new
        {
            Id = id,
            Message = message,
            Timestamp = DateTimeOffset.UtcNow.ToString("o"),
        };

        _logger.LogWarning("Broadcasting error to clients: {Message}", message);

        try
        {
            await _hub.Clients.Group("errors").SendAsync("BackendError", error);
        }
        catch
        {
            // Best-effort: don't crash if no clients are connected
        }
    }
}
