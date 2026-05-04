using Microsoft.Extensions.Logging;
using SapphWire.Core;

namespace SapphWire.Host.Services;

public class WindowsToastNotifier : IToastNotifier
{
    private readonly ILogger<WindowsToastNotifier> _logger;

    public WindowsToastNotifier(ILogger<WindowsToastNotifier> logger)
    {
        _logger = logger;
    }

    public void ShowAlert(AlertRecord alert)
    {
        // CommunityToolkit.WinUI.Notifications integration deferred until
        // single-file publish packaging is validated. For now, log the intent.
        _logger.LogInformation(
            "Toast: {App} connected to {Ip}:{Port} for the first time",
            alert.AppName, alert.RemoteIp, alert.RemotePort);
    }
}
