import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../useUsageData", () => ({
  useUsageData: vi.fn(() => ({
    left: [],
    middle: [],
    right: [],
    totalUp: 0,
    totalDown: 0,
    sparkline: [],
  })),
}));

vi.mock("../useNetworkScope", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../useNetworkScope");
  return { ...actual };
});

const echartsSetOption = vi.fn();
vi.mock("echarts", () => ({
  init: vi.fn(() => ({
    setOption: echartsSetOption,
    resize: vi.fn(),
    dispose: vi.fn(),
    getWidth: vi.fn(() => 400),
    getDom: vi.fn(() => document.createElement("div")),
  })),
}));

vi.mock("react-window", () => ({
  List: ({
    rowComponent: Row,
    rowCount,
  }: {
    rowComponent: (props: { index: number; style: React.CSSProperties }) => React.ReactNode;
    rowCount: number;
    rowHeight: number;
    style?: React.CSSProperties;
  }) => (
    <div>
      {Array.from({ length: rowCount }, (_, i) => (
        <Row key={i} index={i} style={{}} />
      ))}
    </div>
  ),
}));

import UsageTab from "./UsageTab";
import {
  useUsageData,
  type UsageData,
  type UsageFilters,
} from "../useUsageData";

const mockUseUsageData = vi.mocked(useUsageData);

function mockData(partial: Partial<UsageData> = {}): UsageData {
  return {
    left: [],
    middle: [],
    right: [],
    totalUp: 0,
    totalDown: 0,
    sparkline: [],
    ...partial,
  };
}

describe("UsageTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUsageData.mockReturnValue(mockData());
  });

  it("renders the period selector with Day as default", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("period-selector")).toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
  });

  it("renders all three period options in the dropdown", () => {
    render(<UsageTab connection={null} />);
    const select = screen.getByTestId("period-select");
    const options = within(select).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Day", "Week", "Month"]);
  });

  it("renders left/right arrows for period navigation", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("period-prev")).toBeInTheDocument();
    expect(screen.getByTestId("period-next")).toBeInTheDocument();
  });

  it("clicking left arrow decrements offset", () => {
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByTestId("period-prev"));
    expect(mockUseUsageData).toHaveBeenLastCalledWith(
      null,
      "Day",
      -1,
      "Apps",
      expect.any(Object),
      "All",
    );
  });

  it("clicking right arrow increments offset", () => {
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByTestId("period-prev"));
    fireEvent.click(screen.getByTestId("period-next"));
    expect(mockUseUsageData).toHaveBeenLastCalledWith(
      null,
      "Day",
      0,
      "Apps",
      expect.any(Object),
      "All",
    );
  });

  it("changing period resets offset to 0", () => {
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByTestId("period-prev"));
    fireEvent.change(screen.getByTestId("period-select"), {
      target: { value: "Week" },
    });
    expect(mockUseUsageData).toHaveBeenLastCalledWith(
      null,
      "Week",
      0,
      "Apps",
      expect.any(Object),
      "All",
    );
  });

  it("renders two columns (left and middle), no Traffic Types column", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("column-left")).toBeInTheDocument();
    expect(screen.getByTestId("column-middle")).toBeInTheDocument();
    expect(screen.queryByTestId("column-right")).not.toBeInTheDocument();
  });

  it("renders filter pills: Apps, Publishers, Traffic", () => {
    render(<UsageTab connection={null} />);
    const pills = screen.getAllByRole("button").filter(
      (b) => ["Apps", "Publishers", "Traffic"].includes(b.textContent ?? ""),
    );
    expect(pills).toHaveLength(3);
  });

  it("Apps is the default active pill", () => {
    render(<UsageTab connection={null} />);
    const pillButtons = screen.getAllByText("Apps");
    const pill = pillButtons.find((el) => el.tagName === "BUTTON");
    expect(pill).toHaveClass("active");
  });

  it("clicking Publishers pill changes grouping", () => {
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByText("Publishers"));
    expect(mockUseUsageData).toHaveBeenLastCalledWith(
      null,
      "Day",
      0,
      "Publishers",
      expect.any(Object),
      "All",
    );
  });

  it("clicking Traffic pill changes grouping", () => {
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByText("Traffic"));
    expect(mockUseUsageData).toHaveBeenLastCalledWith(
      null,
      "Day",
      0,
      "Traffic",
      expect.any(Object),
      "All",
    );
  });

  it("renders left column rows with name and bytes bar", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        left: [
          { name: "Chrome", bytesUp: 1000, bytesDown: 5000 },
          { name: "Discord", bytesUp: 200, bytesDown: 800 },
        ],
      }),
    );
    render(<UsageTab connection={null} />);
    const col = screen.getByTestId("column-left");
    expect(within(col).getByText("Chrome")).toBeInTheDocument();
    expect(within(col).getByText("Discord")).toBeInTheDocument();
  });

  it("renders middle column (Hosts) rows", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        middle: [{ name: "google.com", bytesUp: 500, bytesDown: 3000 }],
      }),
    );
    render(<UsageTab connection={null} />);
    const col = screen.getByTestId("column-middle");
    expect(within(col).getByText("google.com")).toBeInTheDocument();
  });

  it("does not render Traffic Types column even when data has right entries", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        right: [{ name: "HTTPS", bytesUp: 800, bytesDown: 4000 }],
      }),
    );
    render(<UsageTab connection={null} />);
    expect(screen.queryByTestId("column-right")).not.toBeInTheDocument();
  });

  it("clicking a left column row adds it to filters", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        left: [{ name: "Chrome", bytesUp: 1000, bytesDown: 5000 }],
      }),
    );
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByText("Chrome"));

    const lastCall = mockUseUsageData.mock.calls[mockUseUsageData.mock.calls.length - 1];
    const filters = lastCall[4] as UsageFilters;
    expect(filters.left).toContain("Chrome");
  });

  it("clicking a selected row deselects it", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        left: [{ name: "Chrome", bytesUp: 1000, bytesDown: 5000 }],
      }),
    );
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByText("Chrome"));
    fireEvent.click(screen.getByText("Chrome"));

    const lastCall = mockUseUsageData.mock.calls[mockUseUsageData.mock.calls.length - 1];
    const filters = lastCall[4] as UsageFilters;
    expect(filters.left).not.toContain("Chrome");
  });

  it("clicking a middle column row adds host filter", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        middle: [{ name: "google.com", bytesUp: 500, bytesDown: 3000 }],
      }),
    );
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByText("google.com"));

    const lastCall = mockUseUsageData.mock.calls[mockUseUsageData.mock.calls.length - 1];
    const filters = lastCall[4] as UsageFilters;
    expect(filters.middle).toContain("google.com");
  });

  it("renders a search bar", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("usage-search")).toBeInTheDocument();
  });

  it("multi-select within a column uses OR (multiple items)", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        left: [
          { name: "Chrome", bytesUp: 1000, bytesDown: 5000 },
          { name: "Discord", bytesUp: 200, bytesDown: 800 },
        ],
      }),
    );
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByText("Chrome"));
    fireEvent.click(screen.getByText("Discord"));

    const lastCall = mockUseUsageData.mock.calls[mockUseUsageData.mock.calls.length - 1];
    const filters = lastCall[4] as UsageFilters;
    expect(filters.left).toContain("Chrome");
    expect(filters.left).toContain("Discord");
  });

  it("renders donut chart container", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("donut-chart")).toBeInTheDocument();
  });

  it("renders donut with upload and download values", () => {
    mockUseUsageData.mockReturnValue(
      mockData({ totalUp: 1_000_000, totalDown: 5_000_000 }),
    );
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("donut-chart")).toBeInTheDocument();
  });

  it("renders activity chart instead of sparkline", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("activity-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("usage-sparkline")).not.toBeInTheDocument();
  });

  it("each row shows formatted byte totals", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        left: [{ name: "Chrome", bytesUp: 1_500_000, bytesDown: 5_000_000 }],
      }),
    );
    render(<UsageTab connection={null} />);
    expect(screen.getByText("6.5 MB")).toBeInTheDocument();
  });

  it("renders relative-width bar for each row", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        left: [
          { name: "Chrome", bytesUp: 1000, bytesDown: 5000 },
          { name: "Discord", bytesUp: 200, bytesDown: 800 },
        ],
      }),
    );
    render(<UsageTab connection={null} />);
    const bars = screen.getAllByTestId(/^usage-bar-/);
    expect(bars.length).toBeGreaterThanOrEqual(2);
  });

  it("renders column headers without Traffic Types", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByText("Hosts")).toBeInTheDocument();
    expect(screen.queryByText("Traffic Types")).not.toBeInTheDocument();
  });

  it("left column header matches active pill", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("column-left-header")).toHaveTextContent("Apps");
    fireEvent.click(screen.getByText("Publishers"));
    expect(screen.getByTestId("column-left-header")).toHaveTextContent("Publishers");
  });

  it("renders favicon placeholder for host rows", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        middle: [{ name: "google.com", bytesUp: 500, bytesDown: 3000 }],
      }),
    );
    render(<UsageTab connection={null} />);
    const col = screen.getByTestId("column-middle");
    const icon = within(col).getByTestId("favicon-google.com");
    expect(icon).toBeInTheDocument();
  });

  it("switching pill clears left column filters", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        left: [{ name: "Chrome", bytesUp: 1000, bytesDown: 5000 }],
      }),
    );
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByText("Chrome"));
    fireEvent.click(screen.getByText("Publishers"));

    const lastCall = mockUseUsageData.mock.calls[mockUseUsageData.mock.calls.length - 1];
    const filters = lastCall[4] as UsageFilters;
    expect(filters.left).toEqual([]);
  });

  it("renders the scope selector inside Total bandwidth card", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("scope-selector")).toBeInTheDocument();
  });

  it("renders All, LAN, WAN scope buttons", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("scope-All")).toBeInTheDocument();
    expect(screen.getByTestId("scope-Lan")).toBeInTheDocument();
    expect(screen.getByTestId("scope-Wan")).toBeInTheDocument();
  });

  it("All scope is the default active scope", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("scope-All")).toHaveClass("active");
    expect(screen.getByTestId("scope-Lan")).not.toHaveClass("active");
    expect(screen.getByTestId("scope-Wan")).not.toHaveClass("active");
  });

  it("displays LAN and WAN labels correctly", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("scope-Lan")).toHaveTextContent("LAN");
    expect(screen.getByTestId("scope-Wan")).toHaveTextContent("WAN");
    expect(screen.getByTestId("scope-All")).toHaveTextContent("All");
  });

  it("clicking LAN scope passes Lan to useUsageData", () => {
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByTestId("scope-Lan"));
    const lastCall = mockUseUsageData.mock.calls[mockUseUsageData.mock.calls.length - 1];
    expect(lastCall[5]).toBe("Lan");
  });

  it("clicking WAN scope passes Wan to useUsageData", () => {
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByTestId("scope-Wan"));
    const lastCall = mockUseUsageData.mock.calls[mockUseUsageData.mock.calls.length - 1];
    expect(lastCall[5]).toBe("Wan");
  });

  it("clicking All scope passes All to useUsageData", () => {
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByTestId("scope-Wan"));
    fireEvent.click(screen.getByTestId("scope-All"));
    const lastCall = mockUseUsageData.mock.calls[mockUseUsageData.mock.calls.length - 1];
    expect(lastCall[5]).toBe("All");
  });

  it("scope selector activates clicked button", () => {
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByTestId("scope-Lan"));
    expect(screen.getByTestId("scope-Lan")).toHaveClass("active");
    expect(screen.getByTestId("scope-All")).not.toHaveClass("active");
  });

  it("recent activity chart receives sparkline data with bytesUp and bytesDown", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        sparkline: [
          { timestamp: "2024-01-01T00:00:00Z", bytesUp: 100, bytesDown: 500 },
          { timestamp: "2024-01-01T00:05:00Z", bytesUp: 200, bytesDown: 600 },
        ],
      }),
    );
    render(<UsageTab connection={null} />);
    const activityCall = echartsSetOption.mock.calls.find(
      ([opt]: [{ series?: { name: string }[] }]) =>
        Array.isArray(opt.series) && opt.series.some((s: { name: string }) => s.name === "Upload"),
    );
    expect(activityCall).toBeDefined();
    const option = activityCall![0];
    expect(option.series).toHaveLength(2);
    expect(option.series[0].name).toBe("Upload");
    expect(option.series[1].name).toBe("Download");
  });

  it("search bar filters left column rows by name", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        left: [
          { name: "Chrome", bytesUp: 1000, bytesDown: 5000 },
          { name: "Discord", bytesUp: 200, bytesDown: 800 },
        ],
      }),
    );
    render(<UsageTab connection={null} />);
    fireEvent.change(screen.getByTestId("usage-search"), {
      target: { value: "chr" },
    });
    const col = screen.getByTestId("column-left");
    expect(within(col).getByText("Chrome")).toBeInTheDocument();
    expect(within(col).queryByText("Discord")).not.toBeInTheDocument();
  });

  it("search bar filters middle column rows by name", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        middle: [
          { name: "google.com", bytesUp: 500, bytesDown: 3000 },
          { name: "discord.gg", bytesUp: 100, bytesDown: 400 },
        ],
      }),
    );
    render(<UsageTab connection={null} />);
    fireEvent.change(screen.getByTestId("usage-search"), {
      target: { value: "google" },
    });
    const col = screen.getByTestId("column-middle");
    expect(within(col).getByText("google.com")).toBeInTheDocument();
    expect(within(col).queryByText("discord.gg")).not.toBeInTheDocument();
  });

  it("search is case-insensitive", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        left: [
          { name: "Chrome", bytesUp: 1000, bytesDown: 5000 },
          { name: "Discord", bytesUp: 200, bytesDown: 800 },
        ],
      }),
    );
    render(<UsageTab connection={null} />);
    fireEvent.change(screen.getByTestId("usage-search"), {
      target: { value: "CHROME" },
    });
    const col = screen.getByTestId("column-left");
    expect(within(col).getByText("Chrome")).toBeInTheDocument();
    expect(within(col).queryByText("Discord")).not.toBeInTheDocument();
  });

  it("empty search shows all rows", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        left: [
          { name: "Chrome", bytesUp: 1000, bytesDown: 5000 },
          { name: "Discord", bytesUp: 200, bytesDown: 800 },
        ],
      }),
    );
    render(<UsageTab connection={null} />);
    fireEvent.change(screen.getByTestId("usage-search"), {
      target: { value: "chr" },
    });
    fireEvent.change(screen.getByTestId("usage-search"), {
      target: { value: "" },
    });
    const col = screen.getByTestId("column-left");
    expect(within(col).getByText("Chrome")).toBeInTheDocument();
    expect(within(col).getByText("Discord")).toBeInTheDocument();
  });

});
