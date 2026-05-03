using Microsoft.Win32;

namespace SapphWire.Core;

public class WindowsInstalledAppsProvider : IInstalledAppsProvider
{
    private static readonly string[] UninstallPaths = new[]
    {
        @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
    };

    public IReadOnlyList<InstalledAppInfo> GetInstalledApps()
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var apps = new List<InstalledAppInfo>();

        foreach (var path in UninstallPaths)
        {
            using var key = Registry.LocalMachine.OpenSubKey(path);
            if (key == null) continue;

            foreach (var subKeyName in key.GetSubKeyNames())
            {
                using var sub = key.OpenSubKey(subKeyName);
                if (sub == null) continue;

                var displayName = sub.GetValue("DisplayName") as string;
                if (string.IsNullOrWhiteSpace(displayName)) continue;

                var installLocation = sub.GetValue("InstallLocation") as string;
                var displayIcon = sub.GetValue("DisplayIcon") as string;
                var publisher = sub.GetValue("Publisher") as string;

                var exePath = ResolveExePath(displayIcon, installLocation);
                var appId = AppGrouper.GetAppKey(displayName, exePath, displayName);

                if (!seen.Add(appId)) continue;

                apps.Add(new InstalledAppInfo(appId, displayName, exePath, publisher));
            }
        }

        apps.Sort((a, b) => string.Compare(a.DisplayName, b.DisplayName, StringComparison.OrdinalIgnoreCase));
        return apps;
    }

    private static string? ResolveExePath(string? displayIcon, string? installLocation)
    {
        if (!string.IsNullOrEmpty(displayIcon))
        {
            var path = displayIcon.Split(',')[0].Trim('"');
            if (path.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                return path;
        }

        if (!string.IsNullOrEmpty(installLocation))
        {
            try
            {
                foreach (var exe in Directory.EnumerateFiles(installLocation, "*.exe", SearchOption.TopDirectoryOnly))
                    return exe;
            }
            catch { }
        }

        return null;
    }
}
