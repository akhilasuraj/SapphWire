namespace SapphWire.Core;

public interface IScanCoordinator
{
    event Action<int>? ProgressChanged;
    event Action? ScanComplete;
    bool IsScanning { get; }
    Task StartScanAsync(CancellationToken ct = default);
}
