import { useState, useEffect } from "react";
import type { HubConnection } from "@microsoft/signalr";

export interface ActiveAppRow {
  appId: string;
  displayName: string;
  iconUrl: string;
  up: number;
  down: number;
  sparkPoint: number;
  topEndpoint: string;
  endpointCount: number;
  countryCode: string | null;
}

export function useActiveApps(connection: HubConnection | null): ActiveAppRow[] {
  const [data, setData] = useState<ActiveAppRow[]>([]);

  useEffect(() => {
    if (!connection) return;

    const onSnapshot = (snapshot: ActiveAppRow[]) => {
      setData(snapshot);
    };

    const onDelta = (delta: ActiveAppRow[]) => {
      setData(delta);
    };

    connection.on("ActiveAppsSnapshot", onSnapshot);
    connection.on("ActiveAppsDelta", onDelta);
    connection.invoke("SubscribeActiveApps").catch(() => {});

    return () => {
      connection.invoke("UnsubscribeActiveApps").catch(() => {});
      connection.off("ActiveAppsSnapshot", onSnapshot);
      connection.off("ActiveAppsDelta", onDelta);
      setData([]);
    };
  }, [connection]);

  return data;
}
