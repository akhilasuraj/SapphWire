namespace SapphWire.Core;

public record ProcessInfo(string ExeName, string Publisher);

public interface IProcessResolver
{
    ProcessInfo Resolve(int processId);
}
