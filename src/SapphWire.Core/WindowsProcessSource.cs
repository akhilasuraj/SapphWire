using System.Diagnostics;

namespace SapphWire.Core;

public class WindowsProcessSource : IProcessSource
{
    public ProcessInfo? GetInfo(int processId)
    {
        try
        {
            using var proc = Process.GetProcessById(processId);
            var mainModule = proc.MainModule;
            if (mainModule == null) return null;

            var exePath = mainModule.FileName;
            var exeName = Path.GetFileNameWithoutExtension(exePath);
            var productName = "";
            var fileDescription = "";
            var publisher = "";

            try
            {
                var vi = FileVersionInfo.GetVersionInfo(exePath);
                productName = vi.ProductName ?? "";
                fileDescription = vi.FileDescription ?? "";
                publisher = vi.CompanyName ?? "";
            }
            catch
            {
                // Version info extraction is best-effort
            }

            return new ProcessInfo(exeName, exePath, productName, fileDescription, publisher);
        }
        catch
        {
            return null;
        }
    }
}
