namespace SapphWire.Core;

public static class AppGrouper
{
    private static readonly HashSet<string> GenericProductNames =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "Microsoft Windows",
            "Windows",
            "Microsoft® Windows® Operating System",
            "Microsoft .NET",
        };

    public static string GetAppKey(string? productName, string? exePath, string exeName)
    {
        if (!string.IsNullOrWhiteSpace(productName)
            && !GenericProductNames.Contains(productName.Trim()))
        {
            return productName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(exePath))
        {
            var dirName = ExtractInstallDirName(exePath);
            if (dirName != null)
                return dirName;
        }

        return exeName;
    }

    public static string GetAppKey(ProcessInfo info)
    {
        return GetAppKey(info.ProductName, info.ExePath, info.ExeName);
    }

    internal static string? ExtractInstallDirName(string exePath)
    {
        var normalized = exePath.Replace('/', '\\');
        var markers = new[] { "\\Program Files\\", "\\Program Files (x86)\\" };

        foreach (var marker in markers)
        {
            var idx = normalized.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (idx >= 0)
            {
                var afterMarker = normalized[(idx + marker.Length)..];
                var slashIdx = afterMarker.IndexOf('\\');
                if (slashIdx > 0)
                    return afterMarker[..slashIdx];
            }
        }

        return null;
    }
}
