import { useState, useEffect, useRef } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { useLiveThroughput } from "./useLiveThroughput";

export type TimePill = "5 Minutes" | "3 Hours" | "24 Hours" | "Week" | "Month";
export type FilterPill = "All" | "Apps" | "Publishers";
export type YAxisScale =
  | "Auto"
  | "100 KB/s"
  | "1 MB/s"
  | "10 MB/s"
  | "100 MB/s"
  | "1 GB/s";

export interface GraphPoint {
  timestamp: string;
  values: Record<string, number>;
}

function getBucketSeconds(pill: TimePill): number {
  switch (pill) {
    case "5 Minutes":
      return 1;
    case "3 Hours":
      return 60;
    case "24 Hours":
      return 300;
    case "Week":
      return 3600;
    case "Month":
      return 3600;
  }
}

function getRangeSeconds(pill: TimePill): number {
  switch (pill) {
    case "5 Minutes":
      return 300;
    case "3 Hours":
      return 10800;
    case "24 Hours":
      return 86400;
    case "Week":
      return 604800;
    case "Month":
      return 2592000;
  }
}

function getGroupBy(filter: FilterPill): string {
  switch (filter) {
    case "All":
      return "None";
    case "Apps":
      return "App";
    case "Publishers":
      return "Publisher";
  }
}

export function useGraphData(
  connection: HubConnection | null,
  timePill: TimePill,
  filterPill: FilterPill,
): GraphPoint[] {
  const isLive = timePill === "5 Minutes" && filterPill === "All";
  const liveData = useLiveThroughput(isLive ? connection : null);
  const [historicalData, setHistoricalData] = useState<GraphPoint[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLive || !connection) {
      setHistoricalData([]);
      return;
    }

    const fetchData = () => {
      const rangeSeconds = getRangeSeconds(timePill);
      const bucketSeconds = getBucketSeconds(timePill);
      const groupBy = getGroupBy(filterPill);
      const now = new Date();
      const from = new Date(now.getTime() - rangeSeconds * 1000);

      connection
        .invoke(
          "GetGraphSeries",
          from.toISOString(),
          now.toISOString(),
          bucketSeconds,
          groupBy,
        )
        .then((data: GraphPoint[]) => setHistoricalData(data))
        .catch(() => {});
    };

    fetchData();

    if (timePill === "5 Minutes") {
      intervalRef.current = setInterval(fetchData, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [connection, timePill, filterPill, isLive]);

  if (isLive) {
    return liveData.map((p) => ({
      timestamp: p.timestamp,
      values: { Total: p.totalUp + p.totalDown },
    }));
  }

  return historicalData;
}
