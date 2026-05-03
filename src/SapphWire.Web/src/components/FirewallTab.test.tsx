import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../useActiveApps", () => ({
  useActiveApps: vi.fn(() => []),
}));

import FirewallTab from "./FirewallTab";
import { useActiveApps, type ActiveAppRow } from "../useActiveApps";

const mockUseActiveApps = vi.mocked(useActiveApps);

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
    mockUseActiveApps.mockReturnValue([]);
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
    mockUseActiveApps.mockReturnValue([
      makeApp({ appId: "Chrome", displayName: "Chrome" }),
      makeApp({ appId: "Discord", displayName: "Discord" }),
    ]);

    render(<FirewallTab connection={null} />);
    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(screen.getByText("Discord")).toBeInTheDocument();
  });

  it("renders flame toggle icon for each app", () => {
    mockUseActiveApps.mockReturnValue([makeApp()]);
    render(<FirewallTab connection={null} />);
    expect(screen.getByTestId("flame-toggle-Chrome")).toBeInTheDocument();
  });

  it("flame toggle is a no-op (does not throw on click)", () => {
    mockUseActiveApps.mockReturnValue([makeApp()]);
    render(<FirewallTab connection={null} />);
    const flame = screen.getByTestId("flame-toggle-Chrome");
    expect(() => fireEvent.click(flame)).not.toThrow();
  });

  it("renders top endpoint and +N more count", () => {
    mockUseActiveApps.mockReturnValue([
      makeApp({ topEndpoint: "api.example.com:443", endpointCount: 8 }),
    ]);
    render(<FirewallTab connection={null} />);
    expect(screen.getByText("api.example.com:443")).toBeInTheDocument();
    expect(screen.getByText("+7 more")).toBeInTheDocument();
  });

  it("does not show +N more when only 1 endpoint", () => {
    mockUseActiveApps.mockReturnValue([
      makeApp({ topEndpoint: "single.com:443", endpointCount: 1 }),
    ]);
    render(<FirewallTab connection={null} />);
    expect(screen.getByText("single.com:443")).toBeInTheDocument();
    expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
  });

  it("renders live up/down rates", () => {
    mockUseActiveApps.mockReturnValue([
      makeApp({ up: 1500, down: 3000 }),
    ]);
    render(<FirewallTab connection={null} />);
    expect(screen.getByTestId("rate-up-Chrome")).toBeInTheDocument();
    expect(screen.getByTestId("rate-down-Chrome")).toBeInTheDocument();
  });

  it("renders sparkline SVG for each app", () => {
    mockUseActiveApps.mockReturnValue([makeApp()]);
    render(<FirewallTab connection={null} />);
    expect(screen.getByTestId("sparkline-Chrome")).toBeInTheDocument();
  });

  it("renders country flag emoji when countryCode is present", () => {
    mockUseActiveApps.mockReturnValue([
      makeApp({ countryCode: "US" }),
    ]);
    render(<FirewallTab connection={null} />);
    const flag = screen.getByTestId("flag-Chrome");
    expect(flag).toBeInTheDocument();
  });

  it("does not render flag when countryCode is null", () => {
    mockUseActiveApps.mockReturnValue([
      makeApp({ countryCode: null }),
    ]);
    render(<FirewallTab connection={null} />);
    expect(screen.queryByTestId("flag-Chrome")).not.toBeInTheDocument();
  });

  it("expands app row on click to reveal children placeholder", () => {
    mockUseActiveApps.mockReturnValue([makeApp()]);
    render(<FirewallTab connection={null} />);

    const row = screen.getByTestId("app-row-Chrome");
    fireEvent.click(row);

    expect(screen.getByTestId("expanded-Chrome")).toBeInTheDocument();
  });

  it("collapses expanded row on second click", () => {
    mockUseActiveApps.mockReturnValue([makeApp()]);
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
    mockUseActiveApps.mockReturnValue([makeApp()]);
    render(<FirewallTab connection={null} />);
    const header = screen.getByText("Active Apps");
    fireEvent.click(header);
    expect(screen.queryByTestId("app-row-Chrome")).not.toBeInTheDocument();
  });

  it("formats rates correctly for display", () => {
    mockUseActiveApps.mockReturnValue([
      makeApp({ appId: "Big", displayName: "Big", up: 1500000, down: 500 }),
    ]);
    render(<FirewallTab connection={null} />);
    const upEl = screen.getByTestId("rate-up-Big");
    expect(upEl.textContent).toContain("MB/s");
    const downEl = screen.getByTestId("rate-down-Big");
    expect(downEl.textContent).toContain("B/s");
  });
});
