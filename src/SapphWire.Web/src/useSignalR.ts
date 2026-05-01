import { useState, useEffect, useRef } from "react";
import {
  HubConnectionBuilder,
  HubConnectionState,
  HubConnection,
  LogLevel,
} from "@microsoft/signalr";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export function useSignalR(hubUrl: string) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    connectionRef.current = connection;

    connection.on("Pong", () => {
      setStatus("connected");
    });

    connection.onreconnecting(() => setStatus("connecting"));
    connection.onreconnected(() => setStatus("connected"));
    connection.onclose(() => setStatus("disconnected"));

    setStatus("connecting");
    connection
      .start()
      .then(() => {
        setStatus(
          connection.state === HubConnectionState.Connected
            ? "connected"
            : "disconnected",
        );
      })
      .catch(() => {
        setStatus("disconnected");
      });

    return () => {
      connection.stop();
    };
  }, [hubUrl]);

  return status;
}
