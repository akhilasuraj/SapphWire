import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!connection || !appId) return;

    setData([]);
    connection.on("ConnectionsSnapshot", setData);
    connection.on("ConnectionsDelta", setData);
    connection.invoke("SubscribeConnections", appId).catch(() => {});

    return () => {
      connection.invoke("UnsubscribeConnections", appId).catch(() => {});
      connection.off("ConnectionsSnapshot", setData);
      connection.off("ConnectionsDelta", setData);
      setData([]);
    };
  }, [connection, appId]);

  return data;
}
