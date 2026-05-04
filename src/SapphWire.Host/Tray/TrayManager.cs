using SapphWire.Core;

namespace SapphWire.Host.Tray;

public class TrayManager : IDisposable
{
    private readonly IHostApplicationLifetime _lifetime;
    private readonly IBrowserLauncher _browserLauncher;
    private readonly INetworkCapture _capture;
    private bool _isPaused;

    public TrayManager(
        IHostApplicationLifetime lifetime,
        IBrowserLauncher browserLauncher,
        INetworkCapture capture)
    {
        _lifetime = lifetime;
        _browserLauncher = browserLauncher;
        _capture = capture;
    }

    public bool IsPaused => _isPaused;

    public void Initialize()
    {
    }

    public void OpenDashboard()
    {
        _browserLauncher.OpenUrl(HostInfo.DashboardUrl);
    }

    public void PauseMonitoring()
    {
        if (_isPaused) return;
        _capture.Stop();
        _isPaused = true;
    }

    public void ResumeMonitoring()
    {
        if (!_isPaused) return;
        _capture.Start();
        _isPaused = false;
    }

    public void Quit()
    {
        _lifetime.StopApplication();
    }

    public void Dispose()
    {
    }
}
