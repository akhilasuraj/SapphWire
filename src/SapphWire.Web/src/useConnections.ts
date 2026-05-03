import { useState, useEffect, useCallback } from "react";
import type { HubConnection } from "@microsoft/signalr";

export interface ConnectionDetail {
  exeName: string;
  pid: number;
  remoteHost: string;
  remotePort: number;
  up: number;
  down: number;
  countryCode: string | null;
}

export function useConnections(
  connection: HubConnection | null,
  appId: string | null,
): ConnectionDetail[] {
  const [data, setData] = useState<ConnectionDetail[]>([]);

  const onSnapshot = useCallback((snapshot: ConnectionDetail[]) => {
    setData(snapshot);
  }, []);

  const onDelta = useCallback((delta: ConnectionDetail[]) => {
    setData(delta);
  }, []);

  useEffect(() => {
    if (!connection || !appId) return;

    setData([]);
    connection.on("ConnectionsSnapshot", onSnapshot);
    connection.on("ConnectionsDelta", onDelta);
    connection.invoke("SubscribeConnections", appId).catch(() => {});

    return () => {
      connection.invoke("UnsubscribeConnections", appId).catch(() => {});
      connection.off("ConnectionsSnapshot", onSnapshot);
      connection.off("ConnectionsDelta", onDelta);
      setData([]);
    };
  }, [connection, appId, onSnapshot, onDelta]);

  return data;
}
