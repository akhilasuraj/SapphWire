namespace SapphWire.Core;

public interface INetworkCapture : IDisposable
{
    event Action<NetworkEvent>? OnEvent;
    void Start();
    void Stop();
}
