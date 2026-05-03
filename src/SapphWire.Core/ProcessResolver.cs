using System.Collections.Concurrent;
using System.Diagnostics;

namespace SapphWire.Core;

public class ProcessResolver : IProcessResolver
{
    private readonly ConcurrentDictionary<int, ProcessInfo> _cache = new();
    private static readonly ProcessInfo Unknown = new("Unknown", "");

    public ProcessInfo Resolve(int processId)
    {
        return _cache.GetOrAdd(processId, pid =>
        {
            try
            {
                using var proc = Process.GetProcessById(pid);
                var mainModule = proc.MainModule;
                if (mainModule == null)
                    return Unknown;

                var exeName = Path.GetFileNameWithoutExtension(mainModule.FileName);
                var publisher = "";

                try
                {
                    var versionInfo = FileVersionInfo.GetVersionInfo(mainModule.FileName);
                    publisher = versionInfo.CompanyName ?? "";
                }
                catch
                {
                    // Publisher extraction is best-effort
                }

                return new ProcessInfo(exeName, publisher);
            }
            catch
            {
                return Unknown;
            }
        });
    }
}
