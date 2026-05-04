using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace SapphWire.Core;

public class SettingsManager
{
    private readonly string _settingsPath;
    private readonly ILogger<SettingsManager> _logger;
    private AppSettings _current;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public AppSettings Current => _current;

    public event Action<AppSettings>? SettingsChanged;

    public SettingsManager(ILogger<SettingsManager> logger)
    {
        var folder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SapphWire");
        Directory.CreateDirectory(folder);
        _settingsPath = Path.Combine(folder, "settings.json");
        _logger = logger;
        _current = Load();
    }

    public static string GetDataFolder() =>
        Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SapphWire");

    public static string GetLogsFolder() =>
        Path.Combine(GetDataFolder(), "logs");

    private AppSettings Load()
    {
        try
        {
            if (File.Exists(_settingsPath))
            {
                var json = File.ReadAllText(_settingsPath);
                return JsonSerializer.Deserialize<AppSettings>(json, JsonOptions)
                       ?? new AppSettings();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load settings, using defaults");
        }
        return new AppSettings();
    }

    public void Update(Func<AppSettings, AppSettings> mutate)
    {
        _current = mutate(_current);
        Save();
        SettingsChanged?.Invoke(_current);
    }

    private void Save()
    {
        try
        {
            var json = JsonSerializer.Serialize(_current, JsonOptions);
            File.WriteAllText(_settingsPath, json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save settings");
        }
    }
}
