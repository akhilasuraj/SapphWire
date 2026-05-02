import { useEffect, useRef } from "react";
import type { HubConnection } from "@microsoft/signalr";
import * as echarts from "echarts";
import { useLiveThroughput } from "../useLiveThroughput";

interface Props {
  connection: HubConnection | null;
}

const TIME_PILLS = ["5 Minutes", "3 Hours", "24 Hours", "Week", "Month"] as const;

function formatRate(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB/s`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB/s`;
  return `${bytes} B/s`;
}

export default function GraphTab({ connection }: Props) {
  const data = useLiveThroughput(connection);
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

    const timestamps = data.map((d) => d.timestamp);
    const uploadData = data.map((d) => d.totalUp);
    const downloadData = data.map((d) => d.totalDown);

    instanceRef.current.setOption({
      animation: false,
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(17,24,39,0.95)",
        borderColor: "#374151",
        textStyle: { color: "#e5e7eb" },
        formatter: (params: Array<{ seriesName: string; value: number; axisValueLabel: string }>) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const time = new Date(params[0].axisValueLabel).toLocaleTimeString();
          const lines = params.map(
            (p: { seriesName: string; value: number }) => `${p.seriesName}: ${formatRate(p.value)}`,
          );
          return `${time}<br/>${lines.join("<br/>")}`;
        },
      },
      grid: {
        left: 60,
        right: 20,
        top: 20,
        bottom: 30,
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
        axisLabel: {
          formatter: (val: number) => formatRate(val),
          color: "#9ca3af",
        },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "#1f2937" } },
      },
      series: [
        {
          name: "Download",
          type: "line",
          stack: "total",
          areaStyle: { opacity: 0.4 },
          lineStyle: { width: 1 },
          symbol: "none",
          data: downloadData,
          color: "#3b82f6",
        },
        {
          name: "Upload",
          type: "line",
          stack: "total",
          areaStyle: { opacity: 0.4 },
          lineStyle: { width: 1 },
          symbol: "none",
          data: uploadData,
          color: "#10b981",
        },
      ],
    });
  }, [data]);

  const latestUp = data.length > 0 ? data[data.length - 1].totalUp : 0;
  const latestDown = data.length > 0 ? data[data.length - 1].totalDown : 0;

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {TIME_PILLS.map((pill) => (
            <button
              key={pill}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                pill === "5 Minutes"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 cursor-not-allowed"
              }`}
              disabled={pill !== "5 Minutes"}
            >
              {pill}
            </button>
          ))}
        </div>
        <div className="flex gap-6 text-sm">
          <span data-testid="throughput-down" className="text-blue-400">
            ↓ {formatRate(latestDown)}
          </span>
          <span data-testid="throughput-up" className="text-emerald-400">
            ↑ {formatRate(latestUp)}
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
