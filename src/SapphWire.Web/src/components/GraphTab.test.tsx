import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../useGraphData", () => ({
  useGraphData: vi.fn(() => []),
  getRangeSeconds: (pill: string) => {
    const ranges: Record<string, number> = {
      "5 Minutes": 300,
      "3 Hours": 10800,
      "24 Hours": 86400,
      "Week": 604800,
      "Month": 2592000,
      "Year": 31536000,
    };
    return ranges[pill] ?? 300;
  },
}));

vi.mock("../useAlerts", () => ({
  useAlerts: vi.fn(() => ({
    alerts: [],
    unreadCount: 0,
    alertTimestamps: [],
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    deleteAlert: vi.fn(),
  })),
}));

vi.mock("echarts", () => {
  const instance = {
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    getWidth: vi.fn(() => 800),
    getDom: vi.fn(() => document.createElement("div")),
  };
  return {
    init: vi.fn(() => instance),
    _instance: instance,
  };
});

import GraphTab from "./GraphTab";
import { useGraphData, type GraphPoint } from "../useGraphData";
import * as echarts from "echarts";

const mockUseGraphData = vi.mocked(useGraphData);
const mockEchartsInstance = (echarts as unknown as { _instance: { setOption: ReturnType<typeof vi.fn> } })._instance;

function lastSetOptionCall() {
  const calls = mockEchartsInstance.setOption.mock.calls;
  return calls[calls.length - 1];
}

function lastOptions() {
  return lastSetOptionCall()[0] as Record<string, unknown>;
}

describe("GraphTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGraphData.mockReturnValue([]);
  });

  it("renders the chart container", () => {
    render(<GraphTab connection={null} />);
    expect(screen.getByTestId("graph-chart")).toBeInTheDocument();
  });

  it("renders all six time pills including Year", () => {
    render(<GraphTab connection={null} />);
    for (const label of ["5 Minutes", "3 Hours", "24 Hours", "Week", "Month", "Year"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders 5 Minutes as the default active time pill", () => {
    render(<GraphTab connection={null} />);
    expect(screen.getByText("5 Minutes")).toHaveClass("active");
    expect(screen.getByText("3 Hours")).not.toHaveClass("active");
  });

  it("all time pills are enabled and clickable", () => {
    render(<GraphTab connection={null} />);
    for (const label of ["5 Minutes", "3 Hours", "24 Hours", "Week", "Month", "Year"]) {
      expect(screen.getByText(label)).not.toBeDisabled();
    }
  });

  it("clicking a time pill makes it active and deactivates others", () => {
    render(<GraphTab connection={null} />);

    fireEvent.click(screen.getByText("3 Hours"));

    expect(screen.getByText("3 Hours")).toHaveClass("active");
    expect(screen.getByText("5 Minutes")).not.toHaveClass("active");
    expect(screen.getByText("24 Hours")).not.toHaveClass("active");
  });

  it("passes timePill and filterPill to useGraphData", () => {
    const mockConn = {} as Parameters<typeof useGraphData>[0];
    render(<GraphTab connection={mockConn} />);

    expect(mockUseGraphData).toHaveBeenCalledWith(mockConn, "5 Minutes", "All");
  });

  it("clicking a different pill passes it to useGraphData", () => {
    render(<GraphTab connection={null} />);

    fireEvent.click(screen.getByText("Week"));

    expect(mockUseGraphData).toHaveBeenCalledWith(null, "Week", "All");
  });

  it("renders filter pills: All, Apps, Publishers", () => {
    render(<GraphTab connection={null} />);

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(screen.getByText("Publishers")).toBeInTheDocument();
  });

  it("does not render Traffic filter pill (hidden in v1)", () => {
    render(<GraphTab connection={null} />);
    expect(screen.queryByText("Traffic")).not.toBeInTheDocument();
  });

  it("clicking Apps filter updates the filter and calls useGraphData", () => {
    render(<GraphTab connection={null} />);

    fireEvent.click(screen.getByText("Apps"));

    expect(mockUseGraphData).toHaveBeenCalledWith(null, "5 Minutes", "Apps");
  });

  it("renders Y-axis dropdown with Auto as default", () => {
    render(<GraphTab connection={null} />);

    const dropdown = screen.getByTestId("y-axis-scale");
    expect(dropdown).toBeInTheDocument();
    expect(dropdown).toHaveValue("Auto");
  });

  it("Y-axis dropdown has all preset options", () => {
    render(<GraphTab connection={null} />);

    const dropdown = screen.getByTestId("y-axis-scale");
    const options = within(dropdown).getAllByRole("option");
    const labels = options.map((o) => o.textContent);

    expect(labels).toEqual([
      "Auto",
      "100 KB/s",
      "1 MB/s",
      "10 MB/s",
      "100 MB/s",
      "1 GB/s",
    ]);
  });

  it("shows a throughput summary when data is present", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 3072 } },
      { timestamp: "2024-01-01T00:00:01Z", values: { Total: 4608 } },
    ];
    mockUseGraphData.mockReturnValue(data);

    render(<GraphTab connection={null} />);
    expect(screen.getByTestId("throughput-total")).toBeInTheDocument();
  });

  it("configures ECharts with dataZoom for minimap", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);

    render(<GraphTab connection={null} />);

    const options = lastOptions() as { dataZoom?: unknown[] };
    expect(options.dataZoom).toBeDefined();
    expect(options.dataZoom!.length).toBeGreaterThanOrEqual(1);
  });

  it("renders stacked series for grouped data", () => {
    const data: GraphPoint[] = [
      {
        timestamp: "2024-01-01T00:00:00Z",
        values: { Chrome: 1000, Discord: 500, Firefox: 300, Other: 100 },
      },
    ];
    mockUseGraphData.mockReturnValue(data);

    render(<GraphTab connection={null} />);

    const options = lastOptions() as { series?: Array<{ name: string }> };
    expect(options.series).toBeDefined();
    const names = options.series!.map((s) => s.name);
    expect(names).toContain("Chrome");
    expect(names).toContain("Discord");
    expect(names).toContain("Other");
  });

  it("clicking Publishers filter passes Publishers to useGraphData", () => {
    render(<GraphTab connection={null} />);

    fireEvent.click(screen.getByText("Publishers"));

    expect(mockUseGraphData).toHaveBeenCalledWith(null, "5 Minutes", "Publishers");
  });

  it("configures dataZoom with both inside and slider types", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);

    render(<GraphTab connection={null} />);

    const options = lastOptions() as { dataZoom?: Array<{ type: string }> };
    expect(options.dataZoom).toBeDefined();
    const types = options.dataZoom!.map((d) => d.type);
    expect(types).toContain("inside");
    expect(types).toContain("slider");
  });

  it("Y-axis scale change updates chart max value", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);

    render(<GraphTab connection={null} />);

    fireEvent.change(screen.getByTestId("y-axis-scale"), {
      target: { value: "1 MB/s" },
    });

    const options = lastOptions() as { yAxis?: { max?: number } };
    expect(options.yAxis?.max).toBe(1_000_000);
  });

  it("includes alert marker placeholder in chart options", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);

    render(<GraphTab connection={null} />);

    const options = lastOptions() as {
      series?: Array<{ markLine?: unknown }>;
    };

    const seriesWithMarkers = options.series?.filter((s) => s.markLine);
    expect(seriesWithMarkers?.length).toBeGreaterThanOrEqual(1);
  });

  // --- Issue #16: New acceptance criteria tests ---

  it("does not render search bar on Graph tab", () => {
    render(<GraphTab connection={null} />);
    expect(screen.queryByPlaceholderText("Find an app or host…")).not.toBeInTheDocument();
  });

  it("Y-axis has no per-line numeric labels (axisLabel show false)", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    const options = lastOptions() as { yAxis?: { axisLabel?: { show?: boolean } } };
    expect(options.yAxis?.axisLabel?.show).toBe(false);
  });

  it("Y-axis has exactly 2 gridlines (splitNumber 2)", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    const options = lastOptions() as { yAxis?: { splitNumber?: number } };
    expect(options.yAxis?.splitNumber).toBe(2);
  });

  it("shows peak value label above chart", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 5_000_000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    const peakLabel = screen.getByTestId("peak-label");
    expect(peakLabel).toBeInTheDocument();
    expect(peakLabel.textContent).toContain("5.0 MB/s");
  });

  it("peak label shows speed units in 5-min view", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 2_500_000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    const peakLabel = screen.getByTestId("peak-label");
    expect(peakLabel.textContent).toContain("MB/s");
  });

  it("peak label shows bytes units in historical view", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 2_500_000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    fireEvent.click(screen.getByText("3 Hours"));

    const peakLabel = screen.getByTestId("peak-label");
    expect(peakLabel.textContent).toContain("MB");
    expect(peakLabel.textContent).not.toContain("MB/s");
  });

  it("X-axis uses time type for full window span", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    const options = lastOptions() as { xAxis?: { type?: string; min?: number; max?: number } };
    expect(options.xAxis?.type).toBe("time");
    expect(options.xAxis?.min).toBeDefined();
    expect(options.xAxis?.max).toBeDefined();
  });

  it("X-axis min/max span the full selected window", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    const options = lastOptions() as { xAxis?: { min?: number; max?: number } };
    const span = options.xAxis!.max! - options.xAxis!.min!;
    expect(span).toBe(300_000);
  });

  it("minimap defaults to rightmost 20 percent (start 80, end 100)", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    const options = lastOptions() as { dataZoom?: Array<{ type: string; start?: number; end?: number }> };
    const slider = options.dataZoom?.find((d) => d.type === "slider");
    expect(slider?.start).toBe(80);
    expect(slider?.end).toBe(100);
  });

  it("setOption uses merge mode (not notMerge) to preserve minimap state", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    const call = lastSetOptionCall();
    expect(call[1]).not.toBe(true);
    expect(call[1]).toEqual({ replaceMerge: ["series"] });
  });

  it("series lines are curve-smoothed", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    const options = lastOptions() as { series?: Array<{ smooth?: boolean }> };
    for (const s of options.series ?? []) {
      expect(s.smooth).toBe(true);
    }
  });

  it("historical view shows total volume figure", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1_000_000 } },
      { timestamp: "2024-01-01T00:01:00Z", values: { Total: 2_000_000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    fireEvent.click(screen.getByText("3 Hours"));

    const totalEl = screen.getByTestId("total-volume");
    expect(totalEl).toBeInTheDocument();
    expect(totalEl.textContent).toContain("3.0 MB");
  });

  it("5-min view does not show total volume figure", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    expect(screen.queryByTestId("total-volume")).not.toBeInTheDocument();
  });

  it("5-min view shows throughput-total, not total-volume", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    expect(screen.getByTestId("throughput-total")).toBeInTheDocument();
    expect(screen.queryByTestId("total-volume")).not.toBeInTheDocument();
  });

  it("historical view shows total-volume, not throughput-total", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    fireEvent.click(screen.getByText("Week"));

    expect(screen.getByTestId("total-volume")).toBeInTheDocument();
    expect(screen.queryByTestId("throughput-total")).not.toBeInTheDocument();
  });

  it("series data uses [timestamp, value] pairs for time axis", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
      { timestamp: "2024-01-01T00:00:01Z", values: { Total: 2000 } },
    ];
    mockUseGraphData.mockReturnValue(data);
    render(<GraphTab connection={null} />);

    const options = lastOptions() as { series?: Array<{ data?: unknown[][] }> };
    const seriesData = options.series?.[0]?.data;
    expect(seriesData).toBeDefined();
    expect(seriesData![0]).toEqual(["2024-01-01T00:00:00Z", 1000]);
    expect(seriesData![1]).toEqual(["2024-01-01T00:00:01Z", 2000]);
  });
});
