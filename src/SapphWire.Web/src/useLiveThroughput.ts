import { useState, useEffect } from "react";
import type { HubConnection } from "@microsoft/signalr";

export interface ThroughputPoint {
  timestamp: string;
  totalUp: number;
  totalDown: number;
}

const MAX_POINTS = 300;

export function useLiveThroughput(
  connection: HubConnection | null,
): ThroughputPoint[] {
  const [data, setData] = useState<ThroughputPoint[]>([]);

  useEffect(() => {
    if (!connection) return;

    const onSnapshot = (snapshot: ThroughputPoint[]) => {
      setData(snapshot.slice(-MAX_POINTS));
    };

    const onDelta = (point: ThroughputPoint) => {
      setData((prev) => [...prev, point].slice(-MAX_POINTS));
    };

    connection.on("ThroughputSnapshot", onSnapshot);
    connection.on("ThroughputDelta", onDelta);
    connection.invoke("SubscribeLiveThroughput").catch(() => {});

    return () => {
      connection.invoke("UnsubscribeLiveThroughput").catch(() => {});
      connection.off("ThroughputSnapshot", onSnapshot);
      connection.off("ThroughputDelta", onDelta);
      setData([]);
    };
  }, [connection]);

  return data;
}
