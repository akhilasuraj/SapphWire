namespace SapphWire.Core;

public interface IProcessSource
{
    ProcessInfo? GetInfo(int processId);
}
