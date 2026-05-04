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

vi.mock("echarts", () => {
  const instance = {
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    getWidth: vi.fn(() => 400),
    getDom: vi.fn(() => document.createElement("div")),
  };
  return {
    init: vi.fn(() => instance),
    _instance: instance,
  };
});

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
    );
  });

  it("renders three columns", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("column-left")).toBeInTheDocument();
    expect(screen.getByTestId("column-middle")).toBeInTheDocument();
    expect(screen.getByTestId("column-right")).toBeInTheDocument();
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
    expect(pill).toHaveClass("bg-blue-600");
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

  it("renders right column (Traffic) rows", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        right: [{ name: "HTTPS", bytesUp: 800, bytesDown: 4000 }],
      }),
    );
    render(<UsageTab connection={null} />);
    const col = screen.getByTestId("column-right");
    expect(within(col).getByText("HTTPS")).toBeInTheDocument();
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

  it("clicking a right column row adds protocol filter", () => {
    mockUseUsageData.mockReturnValue(
      mockData({
        right: [{ name: "HTTPS", bytesUp: 800, bytesDown: 4000 }],
      }),
    );
    render(<UsageTab connection={null} />);
    fireEvent.click(screen.getByText("HTTPS"));

    const lastCall = mockUseUsageData.mock.calls[mockUseUsageData.mock.calls.length - 1];
    const filters = lastCall[4] as UsageFilters;
    expect(filters.right).toContain("HTTPS");
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

  it("renders bottom sparkline strip", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByTestId("usage-sparkline")).toBeInTheDocument();
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

  it("renders column headers", () => {
    render(<UsageTab connection={null} />);
    expect(screen.getByText("Hosts")).toBeInTheDocument();
    expect(screen.getByText("Traffic Types")).toBeInTheDocument();
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
});
