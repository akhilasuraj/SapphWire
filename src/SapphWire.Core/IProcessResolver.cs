namespace SapphWire.Core;

public record ProcessInfo(
    string ExeName,
    string ExePath,
    string ProductName,
    string FileDescription,
    string Publisher
);

public interface IProcessResolver
{
    ProcessInfo Resolve(int processId);
    void Invalidate(int processId);
}
