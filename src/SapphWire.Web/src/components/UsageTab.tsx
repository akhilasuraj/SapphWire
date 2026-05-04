import { useState, useEffect, useRef, useCallback } from "react";
import type { HubConnection } from "@microsoft/signalr";
import * as echarts from "echarts";
import { List } from "react-window";
import {
  useUsageData,
  type UsagePeriod,
  type UsagePill,
  type UsageFilters,
  type UsageRow,
  type SparklinePoint,
} from "../useUsageData";

interface Props {
  connection: HubConnection | null;
}

const PILLS: UsagePill[] = ["Apps", "Publishers", "Traffic"];

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000)
    return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

function UsageRowItem({
  row,
  maxBytes,
  isSelected,
  onClick,
  column,
  showFavicon,
}: {
  row: UsageRow;
  maxBytes: number;
  isSelected: boolean;
  onClick: () => void;
  column: string;
  showFavicon: boolean;
}) {
  const total = row.bytesUp + row.bytesDown;
  const pct = maxBytes > 0 ? (total / maxBytes) * 100 : 0;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
        isSelected
          ? "bg-blue-900/40 border-l-2 border-blue-500"
          : "hover:bg-gray-800/50 border-l-2 border-transparent"
      }`}
    >
      {showFavicon && (
        <img
          data-testid={`favicon-${row.name}`}
          src={`/api/favicons/${encodeURIComponent(row.name)}`}
          alt=""
          className="w-4 h-4 flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "";
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      {!showFavicon && <div className="w-4 h-4 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-medium text-gray-200 truncate">
            {row.name}
          </span>
          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
            {formatBytes(total)}
          </span>
        </div>
        <div
          data-testid={`usage-bar-${column}-${row.name}`}
          className="h-1 rounded-full bg-gray-700 overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-blue-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function UsageColumn({
  testId,
  header,
  headerTestId,
  rows,
  selectedNames,
  onToggle,
  column,
  showFavicon,
}: {
  testId: string;
  header: string;
  headerTestId: string;
  rows: UsageRow[];
  selectedNames: string[];
  onToggle: (name: string) => void;
  column: string;
  showFavicon: boolean;
}) {
  const maxBytes =
    rows.length > 0
      ? Math.max(...rows.map((r) => r.bytesUp + r.bytesDown))
      : 0;

  return (
    <div data-testid={testId} className="flex-1 flex flex-col min-w-0">
      <div
        data-testid={headerTestId}
        className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800"
      >
        {header}
      </div>
      <div className="flex-1 overflow-hidden">
        {rows.length > 0 ? (
          <List
            style={{ height: 400 }}
            rowCount={rows.length}
            rowHeight={40}
            rowProps={{}}
            rowComponent={({ index, style: rowStyle }) => (
              <div style={rowStyle}>
                <UsageRowItem
                  row={rows[index]}
                  maxBytes={maxBytes}
                  isSelected={selectedNames.includes(rows[index].name)}
                  onClick={() => onToggle(rows[index].name)}
                  column={column}
                  showFavicon={showFavicon}
                />
              </div>
            )}
          />
        ) : (
          <div className="px-3 py-6 text-center text-xs text-gray-600">
            No data
          </div>
        )}
      </div>
    </div>
  );
}

function DonutChart({
  totalUp,
  totalDown,
}: {
  totalUp: number;
  totalDown: number;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    instanceRef.current = echarts.init(chartRef.current);
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!instanceRef.current) return;

    instanceRef.current.setOption(
      {
        animation: false,
        tooltip: {
          trigger: "item",
          backgroundColor: "rgba(17,24,39,0.95)",
          borderColor: "#374151",
          textStyle: { color: "#e5e7eb" },
          formatter: (params: { name: string; value: number; percent: number }) =>
            `${params.name}: ${formatBytes(params.value)} (${params.percent}%)`,
        },
        series: [
          {
            type: "pie",
            radius: ["50%", "75%"],
            avoidLabelOverlap: false,
            label: { show: false },
            data: [
              {
                name: "Upload",
                value: totalUp,
                itemStyle: { color: "#10b981" },
              },
              {
                name: "Download",
                value: totalDown,
                itemStyle: { color: "#3b82f6" },
              },
            ],
          },
        ],
      },
      true,
    );
  }, [totalUp, totalDown]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={chartRef}
        data-testid="donut-chart"
        className="w-32 h-32"
      />
      <div className="flex gap-3 text-xs">
        <span className="text-green-400">
          {"↑"} {formatBytes(totalUp)}
        </span>
        <span className="text-blue-400">
          {"↓"} {formatBytes(totalDown)}
        </span>
      </div>
    </div>
  );
}

function UsageSparkline({ data }: { data: SparklinePoint[] }) {
  let points: string;
  if (data.length > 0) {
    const values = data.map((d) => d.value);
    const max = Math.max(...values, 1);
    const h = 30;
    const w = 100;
    const step = data.length > 1 ? w / (data.length - 1) : 0;
    points = values
      .map((v, i) => `${i * step},${h - (v / max) * h + 1}`)
      .join(" ");
  } else {
    points = "0,15 50,15 100,15";
  }

  return (
    <svg
      data-testid="usage-sparkline"
      className="w-full h-10"
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="1"
      />
    </svg>
  );
}

export default function UsageTab({ connection }: Props) {
  const [period, setPeriod] = useState<UsagePeriod>("Day");
  const [offset, setOffset] = useState(0);
  const [pill, setPill] = useState<UsagePill>("Apps");
  const [filters, setFilters] = useState<UsageFilters>({
    left: [],
    middle: [],
    right: [],
  });

  const data = useUsageData(connection, period, offset, pill, filters);

  const handlePeriodChange = useCallback((newPeriod: UsagePeriod) => {
    setPeriod(newPeriod);
    setOffset(0);
  }, []);

  const handlePillChange = useCallback((newPill: UsagePill) => {
    setPill(newPill);
    setFilters((prev) => ({ ...prev, left: [] }));
  }, []);

  const toggleFilter = useCallback(
    (column: "left" | "middle" | "right", name: string) => {
      setFilters((prev) => {
        const current = prev[column];
        const next = current.includes(name)
          ? current.filter((n) => n !== name)
          : [...current, name];
        return { ...prev, [column]: next };
      });
    },
    [],
  );

  return (
    <div className="flex-1 flex flex-col p-4 gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {PILLS.map((p) => (
              <button
                key={p}
                onClick={() => handlePillChange(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  p === pill
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div
            data-testid="period-selector"
            className="flex items-center gap-2"
          >
            <button
              data-testid="period-prev"
              onClick={() => setOffset((o) => o - 1)}
              className="px-2 py-1 text-gray-400 hover:text-gray-200 bg-gray-800 rounded"
            >
              {"<"}
            </button>
            <select
              data-testid="period-select"
              value={period}
              onChange={(e) =>
                handlePeriodChange(e.target.value as UsagePeriod)
              }
              className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
            >
              <option value="Day">Day</option>
              <option value="Week">Week</option>
              <option value="Month">Month</option>
            </select>
            <button
              data-testid="period-next"
              onClick={() => setOffset((o) => o + 1)}
              className="px-2 py-1 text-gray-400 hover:text-gray-200 bg-gray-800 rounded"
            >
              {">"}
            </button>
          </div>
        </div>

        <DonutChart totalUp={data.totalUp} totalDown={data.totalDown} />
      </div>

      <div className="flex-1 flex gap-2 min-h-0">
        <UsageColumn
          testId="column-left"
          header={pill}
          headerTestId="column-left-header"
          rows={data.left}
          selectedNames={filters.left}
          onToggle={(name) => toggleFilter("left", name)}
          column="left"
          showFavicon={false}
        />
        <UsageColumn
          testId="column-middle"
          header="Hosts"
          headerTestId="column-middle-header"
          rows={data.middle}
          selectedNames={filters.middle}
          onToggle={(name) => toggleFilter("middle", name)}
          column="middle"
          showFavicon={true}
        />
        <UsageColumn
          testId="column-right"
          header="Traffic Types"
          headerTestId="column-right-header"
          rows={data.right}
          selectedNames={filters.right}
          onToggle={(name) => toggleFilter("right", name)}
          column="right"
          showFavicon={false}
        />
      </div>

      <div className="border-t border-gray-800 pt-2">
        <UsageSparkline data={data.sparkline} />
      </div>
    </div>
  );
}
