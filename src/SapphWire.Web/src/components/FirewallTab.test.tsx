import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../useActiveApps", () => ({
  useActiveApps: vi.fn(() => ({ apps: [], sparkHistory: {} })),
}));

vi.mock("../useRankedApps", () => ({
  useRankedApps: vi.fn(() => []),
}));

vi.mock("../useConnections", () => ({
  useConnections: vi.fn(() => []),
}));

vi.mock("../useFirewall", () => ({
  useFirewall: vi.fn(() => ({
    state: { blockedApps: [], isSuspended: false, error: null },
    blockApp: vi.fn(() => Promise.resolve()),
    unblockApp: vi.fn(() => Promise.resolve()),
    blockExe: vi.fn(() => Promise.resolve()),
    unblockExe: vi.fn(() => Promise.resolve()),
    isBlocked: () => false,
    isExeBlocked: () => false,
    suspend: vi.fn(() => Promise.resolve()),
    resume: vi.fn(() => Promise.resolve()),
  })),
}));

import FirewallTab from "./FirewallTab";
import { useActiveApps, type ActiveAppRow } from "../useActiveApps";
import { useRankedApps, type RankedApp } from "../useRankedApps";
import { useConnections, type ConnectionDetail } from "../useConnections";
import { useFirewall } from "../useFirewall";

const mockUseActiveApps = vi.mocked(useActiveApps);
const mockUseRankedApps = vi.mocked(useRankedApps);
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

function makeRanked(overrides: Partial<RankedApp> = {}): RankedApp {
  return {
    appId: "Chrome",
    cumulativeBytes: 5000000,
    currentUp: 100,
    currentDown: 200,
    lastSeen: "2026-05-10T00:00:00Z",
    isInstalledOnly: false,
    ...overrides,
  };
}

const defaultFirewall = {
  state: { blockedApps: [], isSuspended: false, error: null },
  blockApp: vi.fn(() => Promise.resolve()),
  unblockApp: vi.fn(() => Promise.resolve()),
  blockExe: vi.fn(() => Promise.resolve()),
  unblockExe: vi.fn(() => Promise.resolve()),
  isBlocked: (_appId: string) => false,
  isExeBlocked: (_appId: string, _exePath: string) => false,
  suspend: vi.fn(() => Promise.resolve()),
  resume: vi.fn(() => Promise.resolve()),
};

describe("FirewallTab", () => {
  beforeEach(() => {
    mockUseActiveApps.mockReturnValue({ apps: [], sparkHistory: {} });
    mockUseRankedApps.mockReturnValue([]);
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
        isSuspended: false,
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
        isSuspended: false,
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
        isSuspended: false,
        error: null,
      },
    });
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ appId: "Chrome" })],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);

    const flame = screen.getByTestId("flame-toggle-Chrome");
    expect(flame.style.background).toContain("--coral");
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
    expect(flame.style.color).toContain("--ink-mute");
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
        isSuspended: false,
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
        isSuspended: false,
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
      state: { blockedApps: [], isSuspended: false, error: null },
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
        isSuspended: false,
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

  // === Master toggle tests (Issue #21) ===

  it("renders master toggle button", () => {
    render(<FirewallTab connection={null} />);
    expect(screen.getByTestId("firewall-master-toggle")).toBeInTheDocument();
  });

  it("shows ON label and Shielding badge when not suspended", () => {
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      state: { blockedApps: [], isSuspended: false, error: null },
    });

    render(<FirewallTab connection={null} />);

    expect(screen.getByTestId("firewall-master-toggle")).toHaveTextContent("ON");
    expect(screen.getByTestId("firewall-badge")).toHaveTextContent("Shielding");
    expect(screen.getByTestId("firewall-banner-title")).toHaveTextContent("Firewall is on");
  });

  it("shows OFF label and Off duty badge when suspended", () => {
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      state: { blockedApps: [], isSuspended: true, error: null },
    });

    render(<FirewallTab connection={null} />);

    expect(screen.getByTestId("firewall-master-toggle")).toHaveTextContent("OFF");
    expect(screen.getByTestId("firewall-badge")).toHaveTextContent("Off duty");
    expect(screen.getByTestId("firewall-banner-title")).toHaveTextContent("Firewall is off");
  });

  it("shows descriptive subtitle when suspended", () => {
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      state: { blockedApps: [], isSuspended: true, error: null },
    });

    render(<FirewallTab connection={null} />);

    expect(screen.getByTestId("firewall-banner-subtitle")).toHaveTextContent(
      "Click the toggle to start shielding your network."
    );
  });

  it("shows blocked/active counts when enabled", () => {
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      isBlocked: (id: string) => id === "Chrome",
      state: {
        blockedApps: [
          { appId: "Chrome", displayName: "Chrome", blockedExePaths: [] },
        ],
        isSuspended: false,
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

    expect(screen.getByTestId("firewall-banner-subtitle")).toHaveTextContent(
      "1 apps blocked"
    );
    expect(screen.getByTestId("firewall-banner-subtitle")).toHaveTextContent(
      "1 active"
    );
  });

  it("clicking toggle calls suspend when firewall is on", () => {
    const suspendFn = vi.fn(() => Promise.resolve());
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      suspend: suspendFn,
      state: { blockedApps: [], isSuspended: false, error: null },
    });

    render(<FirewallTab connection={null} />);

    fireEvent.click(screen.getByTestId("firewall-master-toggle"));
    expect(suspendFn).toHaveBeenCalled();
  });

  it("clicking toggle calls resume when firewall is off", () => {
    const resumeFn = vi.fn(() => Promise.resolve());
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      resume: resumeFn,
      state: { blockedApps: [], isSuspended: true, error: null },
    });

    render(<FirewallTab connection={null} />);

    fireEvent.click(screen.getByTestId("firewall-master-toggle"));
    expect(resumeFn).toHaveBeenCalled();
  });

  it("blocked apps count persists when firewall is suspended", () => {
    mockUseFirewall.mockReturnValue({
      ...defaultFirewall,
      isBlocked: (id: string) => id === "Chrome",
      state: {
        blockedApps: [
          { appId: "Chrome", displayName: "Chrome", blockedExePaths: [] },
        ],
        isSuspended: true,
        error: null,
      },
    });
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ appId: "Chrome" })],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);

    const blockedSection = screen.getByTestId("blocked-apps-section");
    expect(blockedSection).toHaveTextContent("Chrome");
    expect(screen.getByTestId("firewall-badge")).toHaveTextContent("Off duty");
  });

  // === Ranked apps ordering (Issue #13, stories 43-46) ===

  it("displays apps in ranked order from useRankedApps", () => {
    mockUseRankedApps.mockReturnValue([
      makeRanked({ appId: "Discord", cumulativeBytes: 10000000 }),
      makeRanked({ appId: "Chrome", cumulativeBytes: 5000000 }),
      makeRanked({ appId: "Slack", cumulativeBytes: 1000000 }),
    ]);
    mockUseActiveApps.mockReturnValue({
      apps: [
        makeApp({ appId: "Chrome" }),
        makeApp({ appId: "Discord", displayName: "Discord" }),
        makeApp({ appId: "Slack", displayName: "Slack" }),
      ],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);

    const rows = screen.getAllByTestId(/^app-row-/);
    expect(rows[0]).toHaveAttribute("data-testid", "app-row-Discord");
    expect(rows[1]).toHaveAttribute("data-testid", "app-row-Chrome");
    expect(rows[2]).toHaveAttribute("data-testid", "app-row-Slack");
  });

  it("shows cumulative bytes for each app", () => {
    mockUseRankedApps.mockReturnValue([
      makeRanked({ appId: "Chrome", cumulativeBytes: 5000000 }),
    ]);
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ appId: "Chrome" })],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);

    const cumulative = screen.getByTestId("cumulative-Chrome");
    expect(cumulative).toHaveTextContent("5.0 MB");
  });

  it("merges live data from useActiveApps with ranked order", () => {
    mockUseRankedApps.mockReturnValue([
      makeRanked({ appId: "Chrome", cumulativeBytes: 5000000 }),
    ]);
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ appId: "Chrome", up: 9999, down: 8888 })],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);

    expect(screen.getByTestId("rate-up-Chrome")).toHaveTextContent("10.0 KB/s");
    expect(screen.getByTestId("rate-down-Chrome")).toHaveTextContent("8.9 KB/s");
  });

  it("shows ranked apps that have no active data", () => {
    mockUseRankedApps.mockReturnValue([
      makeRanked({ appId: "OldApp", cumulativeBytes: 2000000 }),
    ]);
    mockUseActiveApps.mockReturnValue({ apps: [], sparkHistory: {} });

    render(<FirewallTab connection={null} />);

    expect(screen.getByTestId("app-row-OldApp")).toBeInTheDocument();
    expect(screen.getByTestId("cumulative-OldApp")).toHaveTextContent("2.0 MB");
    expect(screen.getByTestId("rate-up-OldApp")).toHaveTextContent("0 B/s");
  });

  it("appends active apps not in ranked list", () => {
    mockUseRankedApps.mockReturnValue([
      makeRanked({ appId: "Chrome" }),
    ]);
    mockUseActiveApps.mockReturnValue({
      apps: [
        makeApp({ appId: "Chrome" }),
        makeApp({ appId: "NewApp", displayName: "NewApp" }),
      ],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);

    const rows = screen.getAllByTestId(/^app-row-/);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("data-testid", "app-row-Chrome");
    expect(rows[1]).toHaveAttribute("data-testid", "app-row-NewApp");
  });

  // === Show all installed apps toggle (Issue #13, stories 47-49) ===

  it("show installed toggle is unchecked by default", () => {
    render(<FirewallTab connection={null} />);
    const toggle = screen.getByTestId("show-installed-apps-toggle");
    const checkbox = toggle.querySelector("input[type='checkbox']") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("clicking show installed toggle passes includeInstalled=true to useRankedApps", () => {
    render(<FirewallTab connection={null} />);
    const toggle = screen.getByTestId("show-installed-apps-toggle");
    const checkbox = toggle.querySelector("input[type='checkbox']") as HTMLInputElement;

    fireEvent.click(checkbox);

    expect(mockUseRankedApps).toHaveBeenLastCalledWith(null, true);
  });

  it("installed-only apps appear in active section when toggle is on", () => {
    mockUseRankedApps.mockReturnValue([
      makeRanked({ appId: "Chrome", cumulativeBytes: 5000000 }),
      makeRanked({ appId: "Notepad", cumulativeBytes: 0, isInstalledOnly: true }),
    ]);
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ appId: "Chrome" })],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);

    const activeSection = screen.getByTestId("active-apps-section");
    expect(activeSection).toHaveTextContent("Chrome");
    expect(activeSection).toHaveTextContent("Notepad");
  });

  it("cumulative bytes displays correctly in GB range", () => {
    mockUseRankedApps.mockReturnValue([
      makeRanked({ appId: "Chrome", cumulativeBytes: 2_500_000_000 }),
    ]);
    mockUseActiveApps.mockReturnValue({
      apps: [makeApp({ appId: "Chrome" })],
      sparkHistory: {},
    });

    render(<FirewallTab connection={null} />);

    expect(screen.getByTestId("cumulative-Chrome")).toHaveTextContent("2.5 GB");
  });
});
