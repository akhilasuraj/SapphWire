import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("../useGraphData", () => ({
  useGraphData: vi.fn(() => []),
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

describe("GraphTab", () => {
  it("renders the chart container", () => {
    render(<GraphTab connection={null} />);
    expect(screen.getByTestId("graph-chart")).toBeInTheDocument();
  });

  it("renders all five time pills", () => {
    render(<GraphTab connection={null} />);
    for (const label of ["5 Minutes", "3 Hours", "24 Hours", "Week", "Month"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders 5 Minutes as the default active time pill", () => {
    render(<GraphTab connection={null} />);
    expect(screen.getByText("5 Minutes")).toHaveClass("bg-blue-600");
    expect(screen.getByText("3 Hours")).not.toHaveClass("bg-blue-600");
  });

  it("all time pills are enabled and clickable", () => {
    render(<GraphTab connection={null} />);
    for (const label of ["5 Minutes", "3 Hours", "24 Hours", "Week", "Month"]) {
      expect(screen.getByText(label)).not.toBeDisabled();
    }
  });

  it("clicking a time pill makes it active and deactivates others", () => {
    render(<GraphTab connection={null} />);

    fireEvent.click(screen.getByText("3 Hours"));

    expect(screen.getByText("3 Hours")).toHaveClass("bg-blue-600");
    expect(screen.getByText("5 Minutes")).not.toHaveClass("bg-blue-600");
    expect(screen.getByText("24 Hours")).not.toHaveClass("bg-blue-600");
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

    const lastCall =
      mockEchartsInstance.setOption.mock.calls[
        mockEchartsInstance.setOption.mock.calls.length - 1
      ];
    const options = lastCall[0] as { dataZoom?: unknown[] };

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

    const lastCall =
      mockEchartsInstance.setOption.mock.calls[
        mockEchartsInstance.setOption.mock.calls.length - 1
      ];
    const options = lastCall[0] as { series?: Array<{ name: string }> };

    expect(options.series).toBeDefined();
    const names = options.series!.map((s) => s.name);
    expect(names).toContain("Chrome");
    expect(names).toContain("Discord");
    expect(names).toContain("Other");
  });

  it("includes alert marker placeholder in chart options", () => {
    const data: GraphPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", values: { Total: 1000 } },
    ];
    mockUseGraphData.mockReturnValue(data);

    render(<GraphTab connection={null} />);

    const lastCall =
      mockEchartsInstance.setOption.mock.calls[
        mockEchartsInstance.setOption.mock.calls.length - 1
      ];
    const options = lastCall[0] as {
      series?: Array<{ markLine?: unknown }>;
    };

    const seriesWithMarkers = options.series?.filter((s) => s.markLine);
    expect(seriesWithMarkers?.length).toBeGreaterThanOrEqual(1);
  });
});
