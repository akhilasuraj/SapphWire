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
        // H.NotifyIcon setup is Windows-only and requires a UI thread.
        // Actual tray icon registration happens at runtime on Windows.
        // This skeleton provides the menu action handlers.
    }

    public void OpenDashboard()
    {
        _browserLauncher.OpenUrl(HostInfo.DashboardUrl);
    }

    public void PauseMonitoring()
    {
        // No-op stub for v1 skeleton
    }

    public void Quit()
    {
        _lifetime.StopApplication();
    }

    public void Dispose()
    {
        // Cleanup tray icon resources
    }
}
