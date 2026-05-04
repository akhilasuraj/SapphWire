namespace SapphWire.Core;

public class OuiDatabase
{
    private readonly Dictionary<string, string> _entries = new(StringComparer.OrdinalIgnoreCase);

    public int Count => _entries.Count;

    public void LoadFromCsv(TextReader reader)
    {
        string? line;
        while ((line = reader.ReadLine()) != null)
        {
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#'))
                continue;

            var parts = line.Split(',', 2);
            if (parts.Length < 2)
                continue;

            var prefix = NormalizePrefix(parts[0].Trim());
            var vendor = parts[1].Trim().Trim('"');

            if (prefix.Length > 0 && vendor.Length > 0)
                _entries.TryAdd(prefix, vendor);
        }
    }

    public string? Lookup(string mac)
    {
        if (string.IsNullOrWhiteSpace(mac))
            return null;

        var prefix = NormalizePrefix(mac);
        if (prefix.Length >= 6)
            prefix = prefix[..6];

        return _entries.TryGetValue(prefix, out var vendor) ? vendor : null;
    }

    private static string NormalizePrefix(string input)
    {
        return input
            .Replace(":", "")
            .Replace("-", "")
            .Replace(".", "")
            .ToUpperInvariant();
    }
}
