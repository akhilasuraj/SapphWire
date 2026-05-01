import { useState, useEffect } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export function useSignalR(hubUrl: string) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

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
      connection.stop();
    };
  }, [hubUrl]);

  return status;
}
