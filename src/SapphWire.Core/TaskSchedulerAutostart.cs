using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace SapphWire.Core;

public class TaskSchedulerAutostart : IAutostart
{
    private const string TaskName = "SapphWire Autostart";
    private readonly ILogger<TaskSchedulerAutostart> _logger;

    public TaskSchedulerAutostart(ILogger<TaskSchedulerAutostart> logger)
    {
        _logger = logger;
    }

    public bool IsEnabled()
    {
        try
        {
            var result = RunSchtasks($"/Query /TN \"{TaskName}\" /FO CSV /NH");
            return result.ExitCode == 0;
        }
        catch
        {
            return false;
        }
    }

    public void Enable()
    {
        var exePath = Environment.ProcessPath ?? Process.GetCurrentProcess().MainModule?.FileName;
        if (string.IsNullOrEmpty(exePath))
        {
            _logger.LogWarning("Cannot determine executable path for autostart");
            return;
        }

        var result = RunSchtasks(
            $"/Create /TN \"{TaskName}\" /TR \"\\\"{exePath}\\\"\" " +
            "/SC ONLOGON /RL HIGHEST /F");

        if (result.ExitCode == 0)
            _logger.LogInformation("Autostart task created");
        else
            _logger.LogWarning("Failed to create autostart task: {Error}", result.Error);
    }

    public void Disable()
    {
        var result = RunSchtasks($"/Delete /TN \"{TaskName}\" /F");

        if (result.ExitCode == 0)
            _logger.LogInformation("Autostart task removed");
        else
            _logger.LogWarning("Failed to remove autostart task: {Error}", result.Error);
    }

    private static (int ExitCode, string Output, string Error) RunSchtasks(string arguments)
    {
        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "schtasks.exe",
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            }
        };

        process.Start();
        var output = process.StandardOutput.ReadToEnd();
        var error = process.StandardError.ReadToEnd();
        process.WaitForExit(TimeSpan.FromSeconds(10));

        return (process.ExitCode, output, error);
    }
}
