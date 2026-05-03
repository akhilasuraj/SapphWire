import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../useActiveApps", () => ({
  useActiveApps: vi.fn(() => ({ apps: [], sparkHistory: {} })),
}));

vi.mock("../useConnections", () => ({
  useConnections: vi.fn(() => []),
}));

import FirewallTab from "./FirewallTab";
import { useActiveApps, type ActiveAppRow } from "../useActiveApps";
import { useConnections, type ConnectionDetail } from "../useConnections";

const mockUseActiveApps = vi.mocked(useActiveApps);
const mockUseConnections = vi.mocked(useConnections);

function makeConnection(overrides: Partial<ConnectionDetail> = {}): ConnectionDetail {
  return {
    exeName: "chrome",
    pid: 1234,
    remoteHost: "google.com",
    remotePort: 443,
    up: 500,
    down: 1000,
    countryCode: "US",
    ...overrides,
  };
}

function makeApp(overrides: Partial<ActiveAppRow> = {}): ActiveAppRow {
  return {
    appId: "Chrome",
    displayName: "Chrome",
    iconUrl: "/api/icons/Chrome",
    up: 1000,
    down: 2000,
    sparkPoint: 3000,
    topEndpoint: "google.com:443",
    endpointCount: 5,
    countryCode: "US",
    ...overrides,
  };
}

describe("FirewallTab", () => {
  beforeEach(() => {
    mockUseActiveApps.mockReturnValue({ apps: [], sparkHistory: {} });
  });

  it("renders Blocked Apps and Active Apps sections", () => {
    render(<FirewallTab connection={null} />);
    expect(screen.getByText("Blocked Apps")).toBeInTheDocument();
    expect(screen.getByText("Active Apps")).toBeInTheDocument();
  });

  it("shows empty state in Blocked Apps section", () => {
    render(<FirewallTab connection={null} />);
    expect(screen.getByText(/no blocked apps/i)).toBeInTheDocument();
  });

  it("passes connection to useActiveApps", () => {
    const mockConn = {} as Parameters<typeof useActiveApps>[0];
    render(<FirewallTab connection={mockConn} />);
    expect(mockUseActiveApps).toHaveBeenCalledWith(mockConn);
  });

  it("renders app rows when data is present", () => {
    mockUseActiveApps.mockReturnValue({ apps: [
      makeApp({ appId: "Chrome", displayName: "Chrome" }),
      makeApp({ appId: "Discord", displayName: "Discord" }),
    ], sparkHistory: {} });

    render(<FirewallTab connection={null} />);
    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(screen.getByText("Discord")).toBeInTheDocument();
  });

  it("renders flame toggle icon for each app", () => {
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    render(<FirewallTab connection={null} />);
    expect(screen.getByTestId("flame-toggle-Chrome")).toBeInTheDocument();
  });

  it("flame toggle is a no-op (does not throw on click)", () => {
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    render(<FirewallTab connection={null} />);
    const flame = screen.getByTestId("flame-toggle-Chrome");
    expect(() => fireEvent.click(flame)).not.toThrow();
  });

  it("renders top endpoint and +N more count", () => {
    mockUseActiveApps.mockReturnValue({ apps: [
      makeApp({ topEndpoint: "api.example.com:443", endpointCount: 8 }),
    ], sparkHistory: {} });
    render(<FirewallTab connection={null} />);
    expect(screen.getByText("api.example.com:443")).toBeInTheDocument();
    expect(screen.getByText("+7 more")).toBeInTheDocument();
  });

  it("does not show +N more when only 1 endpoint", () => {
    mockUseActiveApps.mockReturnValue({ apps: [
      makeApp({ topEndpoint: "single.com:443", endpointCount: 1 }),
    ], sparkHistory: {} });
    render(<FirewallTab connection={null} />);
    expect(screen.getByText("single.com:443")).toBeInTheDocument();
    expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
  });

  it("renders live up/down rates", () => {
    mockUseActiveApps.mockReturnValue({ apps: [
      makeApp({ up: 1500, down: 3000 }),
    ], sparkHistory: {} });
    render(<FirewallTab connection={null} />);
    expect(screen.getByTestId("rate-up-Chrome")).toBeInTheDocument();
    expect(screen.getByTestId("rate-down-Chrome")).toBeInTheDocument();
  });

  it("renders sparkline SVG for each app", () => {
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    render(<FirewallTab connection={null} />);
    expect(screen.getByTestId("sparkline-Chrome")).toBeInTheDocument();
  });

  it("renders country flag emoji when countryCode is present", () => {
    mockUseActiveApps.mockReturnValue({ apps: [
      makeApp({ countryCode: "US" }),
    ], sparkHistory: {} });
    render(<FirewallTab connection={null} />);
    const flag = screen.getByTestId("flag-Chrome");
    expect(flag).toBeInTheDocument();
  });

  it("does not render flag when countryCode is null", () => {
    mockUseActiveApps.mockReturnValue({ apps: [
      makeApp({ countryCode: null }),
    ], sparkHistory: {} });
    render(<FirewallTab connection={null} />);
    expect(screen.queryByTestId("flag-Chrome")).not.toBeInTheDocument();
  });

  it("expands app row on click to reveal children placeholder", () => {
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    render(<FirewallTab connection={null} />);

    const row = screen.getByTestId("app-row-Chrome");
    fireEvent.click(row);

    expect(screen.getByTestId("expanded-Chrome")).toBeInTheDocument();
  });

  it("collapses expanded row on second click", () => {
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    render(<FirewallTab connection={null} />);

    const row = screen.getByTestId("app-row-Chrome");
    fireEvent.click(row);
    expect(screen.getByTestId("expanded-Chrome")).toBeInTheDocument();

    fireEvent.click(row);
    expect(screen.queryByTestId("expanded-Chrome")).not.toBeInTheDocument();
  });

  it("Blocked Apps section is collapsible", () => {
    render(<FirewallTab connection={null} />);
    const header = screen.getByText("Blocked Apps");
    fireEvent.click(header);
    expect(screen.queryByText(/no blocked apps/i)).not.toBeInTheDocument();
  });

  it("Active Apps section is collapsible", () => {
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    render(<FirewallTab connection={null} />);
    const header = screen.getByText("Active Apps");
    fireEvent.click(header);
    expect(screen.queryByTestId("app-row-Chrome")).not.toBeInTheDocument();
  });

  it("sparkline renders dynamic polyline from sparkHistory", () => {
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ appId: "Chrome" })],
      sparkHistory: { Chrome: [0, 100, 200, 100, 0] },
    });
    render(<FirewallTab connection={null} />);
    const svg = screen.getByTestId("sparkline-Chrome");
    const polyline = svg.querySelector("polyline");
    expect(polyline).toBeTruthy();
    const points = polyline!.getAttribute("points")!;
    const coords = points.split(" ");
    expect(coords).toHaveLength(5);
  });

  it("sparkline renders flat line when no sparkHistory exists", () => {
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ appId: "Chrome" })],
      sparkHistory: {},
    });
    render(<FirewallTab connection={null} />);
    const svg = screen.getByTestId("sparkline-Chrome");
    const polyline = svg.querySelector("polyline");
    expect(polyline).toBeTruthy();
    expect(polyline!.getAttribute("points")).toContain("10");
  });

  it("sparkline scales Y axis to max value", () => {
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ appId: "Chrome" })],
      sparkHistory: { Chrome: [0, 500] },
    });
    render(<FirewallTab connection={null} />);
    const svg = screen.getByTestId("sparkline-Chrome");
    const polyline = svg.querySelector("polyline");
    const points = polyline!.getAttribute("points")!;
    const firstY = parseFloat(points.split(" ")[0].split(",")[1]);
    const secondY = parseFloat(points.split(" ")[1].split(",")[1]);
    expect(firstY).toBeGreaterThan(secondY);
  });

  it("formats rates correctly for display", () => {
    mockUseActiveApps.mockReturnValue({ apps: [
      makeApp({ appId: "Big", displayName: "Big", up: 1500000, down: 500 }),
    ], sparkHistory: {} });
    render(<FirewallTab connection={null} />);
    const upEl = screen.getByTestId("rate-up-Big");
    expect(upEl.textContent).toContain("MB/s");
    const downEl = screen.getByTestId("rate-down-Big");
    expect(downEl.textContent).toContain("B/s");
  });

  it("expanded view shows connection details when available", () => {
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    mockUseConnections.mockReturnValue([
      makeConnection({ exeName: "chrome", pid: 1234, remoteHost: "cdn.example.com", remotePort: 443 }),
      makeConnection({ exeName: "chrome_helper", pid: 5678, remoteHost: "gstatic.com", remotePort: 443 }),
    ]);

    render(<FirewallTab connection={null} />);
    fireEvent.click(screen.getByTestId("app-row-Chrome"));

    const expanded = screen.getByTestId("expanded-Chrome");
    expect(expanded).toHaveTextContent("chrome");
    expect(expanded).toHaveTextContent("PID 1234");
    expect(expanded).toHaveTextContent("cdn.example.com:443");
    expect(expanded).toHaveTextContent("chrome_helper");
    expect(expanded).toHaveTextContent("PID 5678");
    expect(expanded).toHaveTextContent("gstatic.com:443");
  });

  it("expanded view shows empty message when no connections", () => {
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    mockUseConnections.mockReturnValue([]);

    render(<FirewallTab connection={null} />);
    fireEvent.click(screen.getByTestId("app-row-Chrome"));

    expect(screen.getByText(/no active connections/i)).toBeInTheDocument();
  });

  it("expanded view shows connection up/down rates", () => {
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    mockUseConnections.mockReturnValue([
      makeConnection({ up: 2500, down: 5000 }),
    ]);

    render(<FirewallTab connection={null} />);
    fireEvent.click(screen.getByTestId("app-row-Chrome"));

    const expanded = screen.getByTestId("expanded-Chrome");
    expect(expanded.textContent).toContain("2.5 KB/s");
    expect(expanded.textContent).toContain("5.0 KB/s");
  });

  it("expanded view shows country flag for connections", () => {
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    mockUseConnections.mockReturnValue([
      makeConnection({ countryCode: "DE" }),
    ]);

    render(<FirewallTab connection={null} />);
    fireEvent.click(screen.getByTestId("app-row-Chrome"));

    const expanded = screen.getByTestId("expanded-Chrome");
    expect(expanded.textContent).toContain("\u{1F1E9}\u{1F1EA}");
  });

  it("passes expanded appId to useConnections", () => {
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });

    render(<FirewallTab connection={null} />);

    expect(mockUseConnections).toHaveBeenCalledWith(null, null);

    fireEvent.click(screen.getByTestId("app-row-Chrome"));

    expect(mockUseConnections).toHaveBeenCalledWith(null, "Chrome");
  });
});
