import { useState, useEffect, useRef, useCallback } from "react";
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

export type SparkHistory = Record<string, number[]>;

const SPARK_MAX = 60;

export interface ActiveAppsResult {
  apps: ActiveAppRow[];
  sparkHistory: SparkHistory;
}

function appendSparkPoints(
  prev: SparkHistory,
  apps: ActiveAppRow[],
): SparkHistory {
  const next = { ...prev };
  for (const app of apps) {
    const buf = next[app.appId] ? [...next[app.appId]] : [];
    buf.push(app.sparkPoint);
    while (buf.length > SPARK_MAX) buf.shift();
    next[app.appId] = buf;
  }
  return next;
}

function initSparkPoints(apps: ActiveAppRow[]): SparkHistory {
  const hist: SparkHistory = {};
  for (const app of apps) {
    hist[app.appId] = [app.sparkPoint];
  }
  return hist;
}

export function useActiveApps(
  connection: HubConnection | null,
): ActiveAppsResult {
  const [data, setData] = useState<ActiveAppRow[]>([]);
  const [sparkHistory, setSparkHistory] = useState<SparkHistory>({});
  const sparkRef = useRef<SparkHistory>({});

  const onSnapshot = useCallback((snapshot: ActiveAppRow[]) => {
    setData(snapshot);
    const hist = initSparkPoints(snapshot);
    sparkRef.current = hist;
    setSparkHistory(hist);
  }, []);

  const onDelta = useCallback((delta: ActiveAppRow[]) => {
    setData(delta);
    const next = appendSparkPoints(sparkRef.current, delta);
    sparkRef.current = next;
    setSparkHistory(next);
  }, []);

  useEffect(() => {
    if (!connection) return;

    connection.on("ActiveAppsSnapshot", onSnapshot);
    connection.on("ActiveAppsDelta", onDelta);
    connection.invoke("SubscribeActiveApps").catch(() => {});

    return () => {
      connection.invoke("UnsubscribeActiveApps").catch(() => {});
      connection.off("ActiveAppsSnapshot", onSnapshot);
      connection.off("ActiveAppsDelta", onDelta);
      setData([]);
      sparkRef.current = {};
      setSparkHistory({});
    };
  }, [connection, onSnapshot, onDelta]);

  return { apps: data, sparkHistory };
}
