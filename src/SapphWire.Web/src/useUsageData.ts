import { useState, useEffect } from "react";
import type { HubConnection } from "@microsoft/signalr";

export type UsagePeriod = "Day" | "Week" | "Month";
export type UsagePill = "Apps" | "Publishers" | "Traffic";

export interface UsageRow {
  name: string;
  bytesUp: number;
  bytesDown: number;
}

export interface UsageFilters {
  left: string[];
  middle: string[];
  right: string[];
}

export interface SparklinePoint {
  timestamp: string;
  value: number;
}

export interface UsageData {
  left: UsageRow[];
  middle: UsageRow[];
  right: UsageRow[];
  totalUp: number;
  totalDown: number;
  sparkline: SparklinePoint[];
}

const EMPTY: UsageData = {
  left: [],
  middle: [],
  right: [],
  totalUp: 0,
  totalDown: 0,
  sparkline: [],
};

function getGroupBy(pill: UsagePill): string {
  switch (pill) {
    case "Apps":
      return "App";
    case "Publishers":
      return "Publisher";
    case "Traffic":
      return "Protocol";
  }
}

function getDateRange(
  period: UsagePeriod,
  offset: number,
): { from: Date; to: Date } {
  const now = new Date();

  if (period === "Day") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() + offset);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { from: start, to: end };
  }

  if (period === "Week") {
    const dayOfWeek = now.getDay();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - dayOfWeek,
    );
    start.setDate(start.getDate() + offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { from: start, to: end };
  }

  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { from: start, to: end };
}

export function useUsageData(
  connection: HubConnection | null,
  period: UsagePeriod,
  offset: number,
  pill: UsagePill,
  filters: UsageFilters,
): UsageData {
  const [data, setData] = useState<UsageData>(EMPTY);

  useEffect(() => {
    if (!connection) {
      setData(EMPTY);
      return;
    }

    const groupBy = getGroupBy(pill);
    const { from, to } = getDateRange(period, offset);

    connection
      .invoke(
        "GetUsage",
        from.toISOString(),
        to.toISOString(),
        groupBy,
        filters,
      )
      .then((result: UsageData) => setData(result))
      .catch(() => {});
  }, [connection, period, offset, pill, filters]);

  return data;
}
