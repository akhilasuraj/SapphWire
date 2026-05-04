namespace SapphWire.Core;

public interface IAutostart
{
    bool IsEnabled();
    void Enable();
    void Disable();
}
