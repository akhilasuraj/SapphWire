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
import { useNetworkScope, type NetworkScope } from "../useNetworkScope";
import { LetterSticker, Sticker, colorFromString } from "./ui/Sticker";
import { HostGlyph, TrafficGlyph } from "./ui/icons";

interface Props {
  connection: HubConnection | null;
}

const PILLS: UsagePill[] = ["Apps", "Publishers", "Traffic"];

const COLUMN_DOTS: Record<string, string> = {
  left: "var(--mint)",
  middle: "var(--lavender)",
  right: "var(--pink)",
};

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
  column: "left" | "middle" | "right";
  showFavicon: boolean;
}) {
  const total = row.bytesUp + row.bytesDown;
  const pct = maxBytes > 0 ? (total / maxBytes) * 100 : 0;
  const stickerColor = colorFromString(row.name);

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "4px 10px",
        cursor: "pointer",
        height: 40,
        background: isSelected ? "var(--cream-2)" : "transparent",
        borderLeft: isSelected
          ? "3px solid var(--lavender-deep)"
          : "3px solid transparent",
        borderRadius: 8,
      }}
    >
      {column === "middle" && showFavicon ? (
        <img
          data-testid={`favicon-${row.name}`}
          src={`/api/favicons/${encodeURIComponent(row.name)}`}
          alt=""
          style={{ width: 16, height: 16, flexShrink: 0 }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "";
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : column === "middle" ? (
        <Sticker color={stickerColor} size="sm" glyph={HostGlyph} />
      ) : column === "right" ? (
        <Sticker color={stickerColor} size="sm" glyph={TrafficGlyph} />
      ) : (
        <LetterSticker name={row.name} color={stickerColor} size="sm" />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: "var(--ink)",
          }}
        >
          {row.name}
        </div>
        <div
          data-testid={`usage-bar-${column}-${row.name}`}
          className="bar-track"
          style={
            {
              marginTop: 4,
              height: 6,
              "--bar": `var(--${stickerColor})`,
            } as React.CSSProperties
          }
        >
          <div
            className="bar-fill"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--ink-soft)",
          minWidth: 56,
          textAlign: "right",
        }}
      >
        {formatBytes(total)}
      </span>
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
  dotColor,
}: {
  testId: string;
  header: string;
  headerTestId: string;
  rows: UsageRow[];
  selectedNames: string[];
  onToggle: (name: string) => void;
  column: "left" | "middle" | "right";
  showFavicon: boolean;
  dotColor: string;
}) {
  const maxBytes =
    rows.length > 0
      ? Math.max(...rows.map((r) => r.bytesUp + r.bytesDown))
      : 0;

  return (
    <div data-testid={testId} className="card">
      <div
        data-testid={headerTestId}
        className="card-title"
      >
        <span className="dot" style={{ background: dotColor }} />
        {header}
      </div>
      {rows.length > 0 ? (
        <List
          style={{ height: 480 }}
          rowCount={rows.length}
          rowHeight={42}
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
        <div
          style={{ padding: "20px 0", textAlign: "center" }}
          className="row-sub"
        >
          No data
        </div>
      )}
    </div>
  );
}

const SCOPES: NetworkScope[] = ["All", "Lan", "Wan"];
const SCOPE_LABELS: Record<NetworkScope, string> = { All: "All", Lan: "LAN", Wan: "WAN" };

function DonutChart({
  totalUp,
  totalDown,
  scope,
  onScopeChange,
}: {
  totalUp: number;
  totalDown: number;
  scope: NetworkScope;
  onScopeChange: (s: NetworkScope) => void;
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
          backgroundColor: "#FFFCF5",
          borderColor: "#2E2A4A",
          borderWidth: 2,
          textStyle: { color: "#2E2A4A", fontFamily: "Nunito" },
          formatter: (params: {
            name: string;
            value: number;
            percent: number;
          }) =>
            `${params.name}: ${formatBytes(params.value)} (${params.percent}%)`,
        },
        series: [
          {
            type: "pie",
            radius: ["52%", "78%"],
            avoidLabelOverlap: false,
            label: { show: false },
            itemStyle: { borderColor: "#2E2A4A", borderWidth: 2.5 },
            data: [
              {
                name: "Upload",
                value: totalUp,
                itemStyle: {
                  color: "#FFCDA8",
                  borderColor: "#2E2A4A",
                  borderWidth: 2.5,
                },
              },
              {
                name: "Download",
                value: totalDown,
                itemStyle: {
                  color: "#FFE69A",
                  borderColor: "#2E2A4A",
                  borderWidth: 2.5,
                },
              },
            ],
          },
        ],
      },
      true,
    );
  }, [totalUp, totalDown]);

  const total = totalUp + totalDown;

  return (
    <div className="card">
      <div className="card-title">
        <span className="dot" style={{ background: "var(--peach)" }} />
        Total Bandwidth
      </div>
      <div
        data-testid="scope-selector"
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 8,
        }}
      >
        {SCOPES.map((s) => (
          <button
            key={s}
            data-testid={`scope-${s}`}
            onClick={() => onScopeChange(s)}
            className={`pill ${s === scope ? "active" : ""}`}
            style={
              s === scope
                ? ({
                    "--p-active": "var(--peach)",
                    fontSize: 11,
                    padding: "3px 10px",
                  } as React.CSSProperties)
                : { fontSize: 11, padding: "3px 10px" }
            }
          >
            {SCOPE_LABELS[s]}
          </button>
        ))}
      </div>
      <div style={{ position: "relative", width: "100%", height: 180 }}>
        <div
          ref={chartRef}
          data-testid="donut-chart"
          style={{ width: "100%", height: 180 }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            textAlign: "center",
          }}
        >
          <div>
            <div className="row-sub">Total</div>
            <div
              style={{
                fontFamily: "Fredoka",
                fontWeight: 600,
                fontSize: 22,
              }}
            >
              {formatBytes(total)}
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 14,
          gap: 8,
        }}
      >
        <div style={{ textAlign: "center", flex: 1 }}>
          <div className="chip" style={{ background: "var(--peach)" }}>
            ↑ Upload
          </div>
          <div
            className="mono"
            style={{ fontSize: 16, marginTop: 6, fontWeight: 700 }}
          >
            {formatBytes(totalUp)}
          </div>
        </div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div className="chip" style={{ background: "var(--butter)" }}>
            ↓ Download
          </div>
          <div
            className="mono"
            style={{ fontSize: 16, marginTop: 6, fontWeight: 700 }}
          >
            {formatBytes(totalDown)}
          </div>
        </div>
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
      style={{ width: "100%", height: 40 }}
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="#2E2A4A"
        strokeWidth="2"
        strokeLinejoin="round"
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
  const { scope, changeScope } = useNetworkScope();

  const data = useUsageData(connection, period, offset, pill, filters, scope);

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
    <div className="page-fade">
      <div className="section-head">
        <h1 className="section-title">Usage</h1>
        <div style={{ flex: 1 }} />
        <div className="pill-row">
          {PILLS.map((p) => (
            <button
              key={p}
              onClick={() => handlePillChange(p)}
              className={`pill ${p === pill ? "active" : ""}`}
              style={
                p === pill
                  ? ({ "--p-active": "var(--mint)" } as React.CSSProperties)
                  : undefined
              }
            >
              {p}
            </button>
          ))}
        </div>
        <div
          data-testid="period-selector"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <button
            data-testid="period-prev"
            onClick={() => setOffset((o) => o - 1)}
            className="pill"
            style={{ padding: "6px 10px", background: "var(--paper)" }}
          >
            {"<"}
          </button>
          <select
            data-testid="period-select"
            value={period}
            onChange={(e) =>
              handlePeriodChange(e.target.value as UsagePeriod)
            }
            className="cart-select"
          >
            <option value="Day">Day</option>
            <option value="Week">Week</option>
            <option value="Month">Month</option>
          </select>
          <button
            data-testid="period-next"
            onClick={() => setOffset((o) => o + 1)}
            className="pill"
            style={{ padding: "6px 10px", background: "var(--paper)" }}
          >
            {">"}
          </button>
        </div>
      </div>

      <div className="grid-usage" style={{ marginBottom: 18 }}>
        <DonutChart totalUp={data.totalUp} totalDown={data.totalDown} scope={scope} onScopeChange={changeScope} />
        <UsageColumn
          testId="column-left"
          header={pill}
          headerTestId="column-left-header"
          rows={data.left}
          selectedNames={filters.left}
          onToggle={(name) => toggleFilter("left", name)}
          column="left"
          showFavicon={false}
          dotColor={COLUMN_DOTS.left}
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
          dotColor={COLUMN_DOTS.middle}
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
          dotColor={COLUMN_DOTS.right}
        />
      </div>

      <div className="card">
        <div className="card-title">
          <span className="dot" style={{ background: "var(--sky)" }} />
          Recent activity
        </div>
        <UsageSparkline data={data.sparkline} />
      </div>
    </div>
  );
}
