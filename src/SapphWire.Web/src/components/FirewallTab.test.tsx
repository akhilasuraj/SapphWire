import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../useActiveApps", () => ({
  useActiveApps: vi.fn(() => ({ apps: [], sparkHistory: {} })),
}));

vi.mock("../useConnections", () => ({
  useConnections: vi.fn(() => []),
}));

vi.mock("../useFirewall", () => ({
  useFirewall: vi.fn(() => ({
    state: { blockedApps: [], error: null },
    blockApp: vi.fn(() => Promise.resolve()),
    unblockApp: vi.fn(() => Promise.resolve()),
    blockExe: vi.fn(() => Promise.resolve()),
    unblockExe: vi.fn(() => Promise.resolve()),
    isBlocked: () => false,
    isExeBlocked: () => false,
  })),
}));

import FirewallTab from "./FirewallTab";
import { useActiveApps, type ActiveAppRow } from "../useActiveApps";
import { useConnections, type ConnectionDetail } from "../useConnections";
import { useFirewall } from "../useFirewall";

const mockUseActiveApps = vi.mocked(useActiveApps);
const mockUseConnections = vi.mocked(useConnections);
const mockUseFirewall = vi.mocked(useFirewall);

function makeConnection(
  overrides: Partial<ConnectionDetail> = {},
): ConnectionDetail {
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

const defaultFirewall = {
  state: { blockedApps: [], error: null },
  blockApp: vi.fn(() => Promise.resolve()),
  unblockApp: vi.fn(() => Promise.resolve()),
  blockExe: vi.fn(() => Promise.resolve()),
  unblockExe: vi.fn(() => Promise.resolve()),
  isBlocked: (_appId: string) => false,
  isExeBlocked: (_appId: string, _exePath: string) => false,
};

describe("FirewallTab", () => {
  beforeEach(() => {
    mockUseActiveApps.mockReturnValue({ apps: [], sparkHistory: {} });
    mockUseConnections.mockReturnValue([]);
    mockUseFirewall.mockReturnValue({ ...defaultFirewall });
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
    mockUseActiveApps.mockReturnValue({
      apps: [
        makeApp({ appId: "Chrome", displayName: "Chrome" }),
        makeApp({ appId: "Discord", displayName: "Discord" }),
      ],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);
    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(screen.getByText("Discord")).toBeInTheDocument();
  });

  it("renders flame toggle icon for each app", () => {
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    render(<FirewallTab connection={null} />);
    expect(screen.getByTestId("flame-toggle-Chrome")).toBeInTheDocument();
  });

  it("flame toggle calls blockApp when app is not blocked", () => {
    const blockApp = vi.fn(() => Promise.resolve());
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      blockApp,
      isBlocked: () => false,
    });
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    render(<FirewallTab connection={null} />);

    const flame = screen.getByTestId("flame-toggle-Chrome");
    fireEvent.click(flame);
    expect(blockApp).toHaveBeenCalledWith("Chrome");
  });

  it("flame toggle calls unblockApp when app is blocked", () => {
    const unblockApp = vi.fn(() => Promise.resolve());
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      unblockApp,
      isBlocked: (id: string) => id === "Chrome",
      state: {
        blockedApps: [
          {
            appId: "Chrome",
            displayName: "Chrome",
            blockedExePaths: ["C:\\chrome.exe"],
          },
        ],
        error: null,
      },
    });
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    render(<FirewallTab connection={null} />);

    const flame = screen.getByTestId("flame-toggle-Chrome");
    fireEvent.click(flame);
    expect(unblockApp).toHaveBeenCalledWith("Chrome");
  });

  it("renders top endpoint and +N more count", () => {
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ topEndpoint: "api.example.com:443", endpointCount: 8 })],
      sparkHistory: {},
    });
    render(<FirewallTab connection={null} />);
    expect(screen.getByText("api.example.com:443")).toBeInTheDocument();
    expect(screen.getByText("+7 more")).toBeInTheDocument();
  });

  it("does not show +N more when only 1 endpoint", () => {
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ topEndpoint: "single.com:443", endpointCount: 1 })],
      sparkHistory: {},
    });
    render(<FirewallTab connection={null} />);
    expect(screen.getByText("single.com:443")).toBeInTheDocument();
    expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
  });

  it("renders live up/down rates", () => {
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ up: 1500, down: 3000 })],
      sparkHistory: {},
    });
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
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ countryCode: "US" })],
      sparkHistory: {},
    });
    render(<FirewallTab connection={null} />);
    const flag = screen.getByTestId("flag-Chrome");
    expect(flag).toBeInTheDocument();
  });

  it("does not render flag when countryCode is null", () => {
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ countryCode: null })],
      sparkHistory: {},
    });
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
    mockUseActiveApps.mockReturnValue({
      apps: [
        makeApp({ appId: "Big", displayName: "Big", up: 1500000, down: 500 }),
      ],
      sparkHistory: {},
    });
    render(<FirewallTab connection={null} />);
    const upEl = screen.getByTestId("rate-up-Big");
    expect(upEl.textContent).toContain("MB/s");
    const downEl = screen.getByTestId("rate-down-Big");
    expect(downEl.textContent).toContain("B/s");
  });

  it("expanded view shows connection details when available", () => {
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    mockUseConnections.mockReturnValue([
      makeConnection({
        exeName: "chrome",
        pid: 1234,
        remoteHost: "cdn.example.com",
        remotePort: 443,
      }),
      makeConnection({
        exeName: "chrome_helper",
        pid: 5678,
        remoteHost: "gstatic.com",
        remotePort: 443,
      }),
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

  // === New tests for Issue #7: Firewall block/unblock ===

  it("blocked app appears in Blocked Apps section, not Active Apps", () => {
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      isBlocked: (id: string) => id === "Chrome",
      state: {
        blockedApps: [
          {
            appId: "Chrome",
            displayName: "Chrome",
            blockedExePaths: ["C:\\chrome.exe"],
          },
        ],
        error: null,
      },
    });
    mockUseActiveApps.mockReturnValue({
      apps: [
        makeApp({ appId: "Chrome" }),
        makeApp({ appId: "Discord", displayName: "Discord" }),
      ],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);

    const blockedSection = screen.getByTestId("blocked-apps-section");
    const activeSection = screen.getByTestId("active-apps-section");

    expect(blockedSection).toHaveTextContent("Chrome");
    expect(activeSection).not.toHaveTextContent("Chrome");
    expect(activeSection).toHaveTextContent("Discord");
  });

  it("blocked app shows lit (orange) flame", () => {
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      isBlocked: (id: string) => id === "Chrome",
      state: {
        blockedApps: [
          {
            appId: "Chrome",
            displayName: "Chrome",
            blockedExePaths: [],
          },
        ],
        error: null,
      },
    });
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ appId: "Chrome" })],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);

    const flame = screen.getByTestId("flame-toggle-Chrome");
    expect(flame.className).toContain("text-orange");
  });

  it("unblocked app shows unlit (gray) flame", () => {
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      isBlocked: () => false,
    });
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ appId: "Chrome" })],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);

    const flame = screen.getByTestId("flame-toggle-Chrome");
    expect(flame.className).toContain("text-gray");
  });

  it("Blocked Apps section shows count of blocked apps", () => {
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      isBlocked: () => true,
      state: {
        blockedApps: [
          {
            appId: "Chrome",
            displayName: "Chrome",
            blockedExePaths: [],
          },
          {
            appId: "Discord",
            displayName: "Discord",
            blockedExePaths: [],
          },
        ],
        error: null,
      },
    });
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ appId: "Chrome" }), makeApp({ appId: "Discord", displayName: "Discord" })],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);

    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  it("displays error banner when firewall error exists", () => {
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      state: {
        blockedApps: [],
        error: "COM error: access denied",
      },
    });

    render(<FirewallTab connection={null} />);

    expect(screen.getByTestId("firewall-error-banner")).toBeInTheDocument();
    expect(screen.getByTestId("firewall-error-banner")).toHaveTextContent(
      "COM error: access denied",
    );
  });

  it("does not display error banner when no error", () => {
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      state: { blockedApps: [], error: null },
    });

    render(<FirewallTab connection={null} />);

    expect(
      screen.queryByTestId("firewall-error-banner"),
    ).not.toBeInTheDocument();
  });

  it("per-child flame toggle calls blockExe", () => {
    const blockExe = vi.fn(() => Promise.resolve());
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      blockExe,
      isBlocked: () => false,
      isExeBlocked: () => false,
    });
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    mockUseConnections.mockReturnValue([
      makeConnection({
        exeName: "chrome",
        pid: 1234,
        remoteHost: "google.com",
        remotePort: 443,
      }),
    ]);

    render(<FirewallTab connection={null} />);
    fireEvent.click(screen.getByTestId("app-row-Chrome"));

    const childFlame = screen.getByTestId("child-flame-chrome-1234");
    fireEvent.click(childFlame);
    expect(blockExe).toHaveBeenCalledWith("Chrome", "chrome");
  });

  it("per-child flame toggle calls unblockExe when child is blocked", () => {
    const unblockExe = vi.fn(() => Promise.resolve());
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      unblockExe,
      isBlocked: () => false,
      isExeBlocked: (_appId: string, exe: string) => exe === "chrome",
    });
    mockUseActiveApps.mockReturnValue({ apps: [makeApp()], sparkHistory: {} });
    mockUseConnections.mockReturnValue([
      makeConnection({
        exeName: "chrome",
        pid: 1234,
        remoteHost: "google.com",
        remotePort: 443,
      }),
    ]);

    render(<FirewallTab connection={null} />);
    fireEvent.click(screen.getByTestId("app-row-Chrome"));

    const childFlame = screen.getByTestId("child-flame-chrome-1234");
    fireEvent.click(childFlame);
    expect(unblockExe).toHaveBeenCalledWith("Chrome", "chrome");
  });

  it("show installed apps toggle is present", () => {
    render(<FirewallTab connection={null} />);
    expect(
      screen.getByTestId("show-installed-apps-toggle"),
    ).toBeInTheDocument();
  });

  it("passes connection to useFirewall", () => {
    const mockConn = {} as Parameters<typeof useFirewall>[0];
    render(<FirewallTab connection={mockConn} />);
    expect(mockUseFirewall).toHaveBeenCalledWith(mockConn);
  });

  it("blocked-only apps (from firewall state but not in active) show in Blocked Apps", () => {
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      isBlocked: (id: string) => id === "Notepad",
      state: {
        blockedApps: [
          {
            appId: "Notepad",
            displayName: "Notepad",
            blockedExePaths: ["C:\\notepad.exe"],
          },
        ],
        error: null,
      },
    });
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ appId: "Chrome" })],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);

    const blockedSection = screen.getByTestId("blocked-apps-section");
    expect(blockedSection).toHaveTextContent("Notepad");
  });
});
