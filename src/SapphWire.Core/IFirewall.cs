namespace SapphWire.Core;

public record BlockedAppEntry(
    string AppId,
    string DisplayName,
    IReadOnlyList<string> BlockedExePaths
);

public record FirewallStateDto(
    IReadOnlyList<BlockedAppEntry> BlockedApps
);

public interface IFirewall
{
    FirewallStateDto GetState();
    void BlockApp(string appName, IReadOnlyList<string> exePaths);
    void UnblockApp(string appName);
    void BlockExe(string appName, string exePath);
    void UnblockExe(string appName, string exePath);
}
