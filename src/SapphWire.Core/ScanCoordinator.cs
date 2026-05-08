using Microsoft.Extensions.Logging;

namespace SapphWire.Core;

public class ScanCoordinator : IScanCoordinator
{
    private readonly SubnetScanner _scanner;
    private readonly TimeSpan _graceWindow;
    private readonly ILogger<ScanCoordinator> _logger;

    public event Action<int>? ProgressChanged;
    public event Action? ScanComplete;
    public bool IsScanning { get; private set; }

    public ScanCoordinator(
        SubnetScanner scanner,
        ILogger<ScanCoordinator> logger,
        TimeSpan? graceWindow = null)
    {
        _scanner = scanner;
        _logger = logger;
        _graceWindow = graceWindow ?? TimeSpan.FromSeconds(2);
    }

    public async Task StartScanAsync(CancellationToken ct = default)
    {
        if (IsScanning) return;
        IsScanning = true;
        ProgressChanged?.Invoke(0);

        void OnSweepProgress(int progress)
        {
            ProgressChanged?.Invoke(Math.Min(progress, 99));
        }

        _scanner.ProgressChanged += OnSweepProgress;
        try
        {
            await _scanner.ScanAsync(ct);

            _logger.LogDebug("Sweep complete, waiting {Grace}ms grace window", _graceWindow.TotalMilliseconds);
            try
            {
                await Task.Delay(_graceWindow, ct);
            }
            catch (OperationCanceledException) { }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Scan failed");
        }
        finally
        {
            _scanner.ProgressChanged -= OnSweepProgress;
            IsScanning = false;
            ProgressChanged?.Invoke(100);
            ScanComplete?.Invoke();
        }
    }
}
