import { useState, useEffect, useRef } from "react";
import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
} from "@microsoft/signalr";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export interface SignalRState {
  status: ConnectionStatus;
  connection: HubConnection | null;
}

export function useSignalR(hubUrl: string): SignalRState {
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
      .then(() => setStatus("connected"))
      .catch(() => setStatus("disconnected"));

    return () => {
      connectionRef.current = null;
      connection.stop();
    };
  }, [hubUrl]);

  return { status, connection: connectionRef.current };
}
