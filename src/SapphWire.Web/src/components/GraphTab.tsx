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
import { SearchIcon } from "./ui/icons";

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
  "#FFCDA8",
  "#FFE69A",
  "#FFC2D1",
  "#BCDFFB",
  "#D6C7FF",
  "#B7E8CF",
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

    const series = seriesNames.map((name, i) => ({
      name,
      type: "line",
      stack: "total",
      areaStyle: { opacity: 0.85 },
      lineStyle: { width: 2.2, color: "#2E2A4A" },
      symbol: "none",
      data: data.map((d) => d.values[name] ?? 0),
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      markLine:
        i === 0
          ? {
              silent: true,
              symbol: ["none", "none"],
              lineStyle: { color: "#F07A66", type: "dashed" as const, width: 2 },
              data: (alertTimestamps && alertTimestamps.length > 0
                ? alertTimestamps
                : FALLBACK_ALERT_TIMESTAMPS
              ).map((ts) => ({
                xAxis: ts,
                label: { show: false },
              })),
            }
          : undefined,
    }));

    instanceRef.current.setOption(
      {
        animation: false,
        tooltip: {
          trigger: "axis",
          backgroundColor: "#FFFCF5",
          borderColor: "#2E2A4A",
          borderWidth: 2,
          textStyle: {
            color: "#2E2A4A",
            fontFamily: "Nunito",
            fontWeight: 600,
          },
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
                textStyle: { color: "#2E2A4A", fontFamily: "Nunito" },
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
            color: "#4A4670",
            fontFamily: "JetBrains Mono",
          },
          axisLine: { lineStyle: { color: "#2E2A4A", width: 2 } },
          splitLine: { show: false },
        },
        yAxis: {
          type: "value",
          max: maxY,
          axisLabel: {
            formatter: (val: number) => formatRate(val),
            color: "#4A4670",
            fontFamily: "JetBrains Mono",
          },
          axisLine: { show: false },
          splitLine: {
            lineStyle: {
              color: "#2E2A4A",
              type: "dashed",
              opacity: 0.18,
            },
          },
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
            height: 24,
            bottom: 14,
            borderColor: "#2E2A4A",
            backgroundColor: "#FDF5E6",
            fillerColor: "rgba(167,147,240,0.25)",
            handleStyle: { color: "#A793F0", borderColor: "#2E2A4A" },
            textStyle: { color: "#4A4670" },
            dataBackground: {
              lineStyle: { color: "#8782AA" },
              areaStyle: { color: "#FDF5E6" },
            },
          },
        ],
        series,
      },
      true,
    );
  }, [data, yAxisScale, alertTimestamps]);

  const latest = data.length > 0 ? data[data.length - 1] : undefined;
  const latestTotal = latest
    ? Object.values(latest.values).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="page-fade">
      <div className="section-head">
        <h1 className="section-title">Live Throughput</h1>
        <span className="sticker-tag">Live</span>
        <div style={{ flex: 1 }} />
        <div className="cart-search">
          {SearchIcon}
          <input placeholder="Find an app or host…" />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div className="pill-row">
            {FILTER_PILLS.map((p) => (
              <button
                key={p}
                onClick={() => setFilterPill(p)}
                className={`pill ${p === filterPill ? "active" : ""}`}
                style={
                  p === filterPill
                    ? ({ "--p-active": "var(--lavender)" } as React.CSSProperties)
                    : undefined
                }
              >
                {p}
              </button>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <select
              data-testid="y-axis-scale"
              value={yAxisScale}
              onChange={(e) => setYAxisScale(e.target.value as YAxisScale)}
              className="cart-select"
            >
              {Y_AXIS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <div className="pill-row">
              {TIME_PILLS.map((p) => (
                <button
                  key={p}
                  onClick={() => setTimePill(p)}
                  className={`pill ${p === timePill ? "active" : ""}`}
                  style={
                    p === timePill
                      ? ({ "--p-active": "var(--peach)" } as React.CSSProperties)
                      : undefined
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          ref={chartRef}
          data-testid="graph-chart"
          style={{
            width: "100%",
            minHeight: 420,
            border: "2.5px solid var(--ink)",
            borderRadius: 14,
            background: "var(--paper)",
            backgroundImage:
              "radial-gradient(circle at 10px 10px, rgba(46,42,74,0.07) 1.2px, transparent 1.6px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 14,
            paddingTop: 12,
            borderTop: "2.5px dashed var(--ink-mute)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span className="chip" style={{ background: "var(--coral)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: "var(--coral-deep)",
                  borderRadius: "50%",
                  border: "2px solid var(--ink)",
                }}
              />
              Alert markers
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="row-sub">Now</span>
            <span
              data-testid="throughput-total"
              className="chip mono"
              style={{ background: "var(--mint)", fontSize: 13, padding: "4px 12px" }}
            >
              {formatRate(latestTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
