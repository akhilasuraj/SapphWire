import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("../useLiveThroughput", () => ({
  useLiveThroughput: vi.fn(() => []),
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
import { useLiveThroughput, ThroughputPoint } from "../useLiveThroughput";

const mockUseLiveThroughput = vi.mocked(useLiveThroughput);

describe("GraphTab", () => {
  it("renders the 5 Minutes pill as active", () => {
    render(<GraphTab connection={null} />);
    const pill = screen.getByText("5 Minutes");
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveClass("bg-blue-600");
  });

  it("renders inactive time range pills", () => {
    render(<GraphTab connection={null} />);
    for (const label of ["3 Hours", "24 Hours", "Week", "Month"]) {
      const pill = screen.getByText(label);
      expect(pill).toBeInTheDocument();
      expect(pill).not.toHaveClass("bg-blue-600");
    }
  });

  it("renders the chart container", () => {
    render(<GraphTab connection={null} />);
    expect(screen.getByTestId("graph-chart")).toBeInTheDocument();
  });

  it("passes connection to useLiveThroughput", () => {
    const mockConn = {} as Parameters<typeof useLiveThroughput>[0];
    render(<GraphTab connection={mockConn} />);
    expect(mockUseLiveThroughput).toHaveBeenCalledWith(mockConn);
  });

  it("shows a throughput summary when data is present", () => {
    const data: ThroughputPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", totalUp: 1024, totalDown: 2048 },
      { timestamp: "2024-01-01T00:00:01Z", totalUp: 512, totalDown: 4096 },
    ];
    mockUseLiveThroughput.mockReturnValue(data);

    render(<GraphTab connection={null} />);
    expect(screen.getByTestId("throughput-up")).toBeInTheDocument();
    expect(screen.getByTestId("throughput-down")).toBeInTheDocument();
  });
});
