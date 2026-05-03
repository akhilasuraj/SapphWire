namespace SapphWire.Core;

public class OuiDatabase
{
    private readonly Dictionary<string, string> _lookup;

    public OuiDatabase(IReadOnlyDictionary<string, string> entries)
    {
        _lookup = new Dictionary<string, string>(
            entries, StringComparer.OrdinalIgnoreCase);
    }

    public string? LookupVendor(string macAddress)
    {
        if (string.IsNullOrWhiteSpace(macAddress)) return null;

        var normalized = macAddress
            .Replace(":", "")
            .Replace("-", "")
            .Replace(".", "");

        if (normalized.Length < 6) return null;

        var prefix = normalized[..6].ToUpperInvariant();
        return _lookup.GetValueOrDefault(prefix);
    }

    public static OuiDatabase LoadFromCsv(string csvContent)
    {
        var entries = new Dictionary<string, string>();
        foreach (var line in csvContent.Split('\n'))
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            var parts = line.Split(',', 2);
            if (parts.Length < 2) continue;

            var prefix = parts[0].Trim().Replace("-", "").Replace(":", "");
            var vendor = parts[1].Trim().Trim('"');
            if (prefix.Length >= 6)
                entries[prefix[..6].ToUpperInvariant()] = vendor;
        }
        return new OuiDatabase(entries);
    }
}
