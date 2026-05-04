import { useState, useEffect, useRef } from "react";
import type { HubConnection } from "@microsoft/signalr";
import * as echarts from "echarts";
import {
  useGraphData,
  type TimePill,
  type FilterPill,
  type YAxisScale,
  type GraphPoint,
} from "../useGraphData";
import { useAlerts } from "../useAlerts";

interface Props {
  connection: HubConnection | null;
}

const TIME_PILLS: TimePill[] = [
  "5 Minutes",
  "3 Hours",
  "24 Hours",
  "Week",
  "Month",
];
const FILTER_PILLS: FilterPill[] = ["All", "Apps", "Publishers"];
const Y_AXIS_OPTIONS: YAxisScale[] = [
  "Auto",
  "100 KB/s",
  "1 MB/s",
  "10 MB/s",
  "100 MB/s",
  "1 GB/s",
];

const SERIES_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#6b7280",
];

const FALLBACK_ALERT_TIMESTAMPS = [
  "2024-01-01T00:01:00Z",
  "2024-01-01T00:03:00Z",
];

function formatRate(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB/s`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB/s`;
  return `${bytes} B/s`;
}

function yAxisMax(scale: YAxisScale): number | undefined {
  switch (scale) {
    case "Auto":
      return undefined;
    case "100 KB/s":
      return 100_000;
    case "1 MB/s":
      return 1_000_000;
    case "10 MB/s":
      return 10_000_000;
    case "100 MB/s":
      return 100_000_000;
    case "1 GB/s":
      return 1_000_000_000;
  }
}

function extractSeriesNames(data: GraphPoint[]): string[] {
  const nameSet = new Set<string>();
  for (const point of data) {
    for (const name of Object.keys(point.values)) {
      nameSet.add(name);
    }
  }
  return Array.from(nameSet);
}

export default function GraphTab({ connection }: Props) {
  const [timePill, setTimePill] = useState<TimePill>("5 Minutes");
  const [filterPill, setFilterPill] = useState<FilterPill>("All");
  const [yAxisScale, setYAxisScale] = useState<YAxisScale>("Auto");

  const data = useGraphData(connection, timePill, filterPill);
  const { alertTimestamps } = useAlerts(connection);
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    instanceRef.current = echarts.init(chartRef.current);

    const onResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!instanceRef.current) return;

    const seriesNames = extractSeriesNames(data);
    const timestamps = data.map((d) => d.timestamp);
    const maxY = yAxisMax(yAxisScale);

    const series = seriesNames.map(
      (name, i) => ({
        name,
        type: "line",
        stack: "total",
        areaStyle: { opacity: 0.4 },
        lineStyle: { width: 1 },
        symbol: "none",
        data: data.map((d) => d.values[name] ?? 0),
        color: SERIES_COLORS[i % SERIES_COLORS.length],
        markLine:
          i === 0
            ? {
                silent: true,
                symbol: ["none", "none"],
                lineStyle: { color: "#f59e0b", type: "dashed" as const },
                data: (alertTimestamps && alertTimestamps.length > 0
                  ? alertTimestamps
                  : FALLBACK_ALERT_TIMESTAMPS
                ).map((ts) => ({
                  xAxis: ts,
                  label: { show: false },
                })),
              }
            : undefined,
      }),
    );

    instanceRef.current.setOption(
      {
        animation: false,
        tooltip: {
          trigger: "axis",
          backgroundColor: "rgba(17,24,39,0.95)",
          borderColor: "#374151",
          textStyle: { color: "#e5e7eb" },
          formatter: (
            params: Array<{
              seriesName: string;
              value: number;
              axisValueLabel: string;
            }>,
          ) => {
            if (!Array.isArray(params) || params.length === 0) return "";
            const time = new Date(
              params[0].axisValueLabel,
            ).toLocaleTimeString();
            const lines = params.map(
              (p) => `${p.seriesName}: ${formatRate(p.value)}`,
            );
            return `${time}<br/>${lines.join("<br/>")}`;
          },
        },
        legend:
          seriesNames.length > 1
            ? {
                data: seriesNames,
                textStyle: { color: "#9ca3af" },
                top: 0,
              }
            : undefined,
        grid: {
          left: 60,
          right: 20,
          top: seriesNames.length > 1 ? 40 : 20,
          bottom: 80,
        },
        xAxis: {
          type: "category",
          data: timestamps,
          axisLabel: {
            formatter: (val: string) => new Date(val).toLocaleTimeString(),
            color: "#9ca3af",
          },
          axisLine: { lineStyle: { color: "#374151" } },
          splitLine: { show: false },
        },
        yAxis: {
          type: "value",
          max: maxY,
          axisLabel: {
            formatter: (val: number) => formatRate(val),
            color: "#9ca3af",
          },
          axisLine: { show: false },
          splitLine: { lineStyle: { color: "#1f2937" } },
        },
        dataZoom: [
          {
            type: "inside",
            start: 0,
            end: 100,
          },
          {
            type: "slider",
            start: 0,
            end: 100,
            height: 30,
            bottom: 10,
            borderColor: "#374151",
            backgroundColor: "#111827",
            fillerColor: "rgba(59,130,246,0.15)",
            handleStyle: { color: "#3b82f6" },
            textStyle: { color: "#9ca3af" },
            dataBackground: {
              lineStyle: { color: "#374151" },
              areaStyle: { color: "#1f2937" },
            },
          },
        ],
        series,
      },
      true,
    );
  }, [data, yAxisScale]);

  const latest = data.length > 0 ? data[data.length - 1] : undefined;
  const latestTotal = latest
    ? Object.values(latest.values).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {TIME_PILLS.map((pill) => (
            <button
              key={pill}
              onClick={() => setTimePill(pill)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                pill === timePill
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {FILTER_PILLS.map((pill) => (
              <button
                key={pill}
                onClick={() => setFilterPill(pill)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  pill === filterPill
                    ? "bg-gray-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {pill}
              </button>
            ))}
          </div>
          <select
            data-testid="y-axis-scale"
            value={yAxisScale}
            onChange={(e) => setYAxisScale(e.target.value as YAxisScale)}
            className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          >
            {Y_AXIS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span data-testid="throughput-total" className="text-blue-400 text-sm">
            {formatRate(latestTotal)}
          </span>
        </div>
      </div>
      <div
        ref={chartRef}
        data-testid="graph-chart"
        className="flex-1 min-h-[400px]"
      />
    </div>
  );
}
