namespace SapphWire.Core;

public record InstalledAppInfo(
    string AppId,
    string DisplayName,
    string? ExePath,
    string? Publisher
);

public interface IInstalledAppsProvider
{
    IReadOnlyList<InstalledAppInfo> GetInstalledApps();
}
