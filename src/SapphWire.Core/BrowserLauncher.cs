using System.Diagnostics;

namespace SapphWire.Core;

public class BrowserLauncher : IBrowserLauncher
{
    public void OpenUrl(string url)
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = url,
            UseShellExecute = true
        });
    }
}
