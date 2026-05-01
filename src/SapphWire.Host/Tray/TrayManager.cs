using SapphWire.Core;

namespace SapphWire.Host.Tray;

public class TrayManager : IDisposable
{
    private readonly IHostApplicationLifetime _lifetime;
    private readonly IBrowserLauncher _browserLauncher;

    public TrayManager(IHostApplicationLifetime lifetime, IBrowserLauncher browserLauncher)
    {
        _lifetime = lifetime;
        _browserLauncher = browserLauncher;
    }

    public void Initialize()
    {
    }

    public void OpenDashboard()
    {
        _browserLauncher.OpenUrl(HostInfo.DashboardUrl);
    }

    public void PauseMonitoring()
    {
    }

    public void Quit()
    {
        _lifetime.StopApplication();
    }

    public void Dispose()
    {
    }
}
