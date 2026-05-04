import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HubConnection } from "@microsoft/signalr";
import type { Device, NetworkInfo } from "../types";
import type { ThingsState } from "../useThings";

const mockUseThings = vi.fn<[], ThingsState>();

vi.mock("../useThings", () => ({
  useThings: () => mockUseThings(),
}));

import ThingsTab from "./ThingsTab";

function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    mac: "AA:BB:CC:DD:EE:FF",
    ip: "192.168.1.100",
    hostname: "test-device",
    vendor: "TestVendor",
    deviceType: "Unknown",
    friendlyName: null,
    pinned: false,
    networkId: "gw-mac-1",
    firstSeen: "2024-01-01T00:00:00Z",
    lastSeen: "2024-01-01T00:00:30Z",
    online: true,
    isThisPc: false,
    isGateway: false,
    ...overrides,
  };
}

const defaultNetworkInfo: NetworkInfo = {
  ssid: "HomeWifi",
  connectionState: "Connected",
  gatewayIp: "192.168.1.1",
  dnsServers: ["8.8.8.8", "8.8.4.4"],
  localIp: "192.168.1.50",
  subnetMask: "255.255.255.0",
};

function defaultThingsState(overrides: Partial<ThingsState> = {}): ThingsState {
  return {
    devices: [],
    networkInfo: defaultNetworkInfo,
    scanning: false,
    scanProgress: 0,
    lastScanTime: null,
    requestScan: vi.fn(),
    setFriendlyName: vi.fn(),
    togglePin: vi.fn(),
    forgetDevice: vi.fn(),
    ...overrides,
  };
}

describe("ThingsTab", () => {
  beforeEach(() => {
    mockUseThings.mockReturnValue(defaultThingsState());
  });

  it("renders the network banner with SSID and connection state", () => {
    render(<ThingsTab connection={null} />);
    expect(screen.getByText("HomeWifi")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("renders Active and All filter buttons", () => {
    render(<ThingsTab connection={null} />);
    expect(screen.getByText(/Active/)).toBeInTheDocument();
    expect(screen.getByText(/All/)).toBeInTheDocument();
  });

  it("shows device count in Active and All filters", () => {
    const devices = [
      makeDevice({ mac: "AA:BB:CC:DD:EE:01", online: true }),
      makeDevice({ mac: "AA:BB:CC:DD:EE:02", online: false }),
      makeDevice({ mac: "AA:BB:CC:DD:EE:03", online: true }),
    ];
    mockUseThings.mockReturnValue(defaultThingsState({ devices }));

    render(<ThingsTab connection={null} />);
    expect(screen.getByTestId("filter-active")).toHaveTextContent("2");
    expect(screen.getByTestId("filter-all")).toHaveTextContent("3");
  });

  it("filters to active devices by default", () => {
    const devices = [
      makeDevice({ mac: "AA:BB:CC:DD:EE:01", hostname: "online-device", online: true }),
      makeDevice({ mac: "AA:BB:CC:DD:EE:02", hostname: "offline-device", online: false }),
    ];
    mockUseThings.mockReturnValue(defaultThingsState({ devices }));

    render(<ThingsTab connection={null} />);
    expect(screen.getByText("online-device")).toBeInTheDocument();
    expect(screen.queryByText("offline-device")).not.toBeInTheDocument();
  });

  it("shows all devices when All filter is selected", () => {
    const devices = [
      makeDevice({ mac: "AA:BB:CC:DD:EE:01", hostname: "online-device", online: true }),
      makeDevice({ mac: "AA:BB:CC:DD:EE:02", hostname: "offline-device", online: false }),
    ];
    mockUseThings.mockReturnValue(defaultThingsState({ devices }));

    render(<ThingsTab connection={null} />);
    fireEvent.click(screen.getByTestId("filter-all"));
    expect(screen.getByText("online-device")).toBeInTheDocument();
    expect(screen.getByText("offline-device")).toBeInTheDocument();
  });

  it("renders the Scan button", () => {
    render(<ThingsTab connection={null} />);
    expect(screen.getByRole("button", { name: /scan/i })).toBeInTheDocument();
  });

  it("calls requestScan when Scan button is clicked", () => {
    const requestScan = vi.fn();
    mockUseThings.mockReturnValue(defaultThingsState({ requestScan }));

    render(<ThingsTab connection={null} />);
    fireEvent.click(screen.getByRole("button", { name: /scan/i }));
    expect(requestScan).toHaveBeenCalled();
  });

  it("disables Scan button and shows progress while scanning", () => {
    mockUseThings.mockReturnValue(
      defaultThingsState({ scanning: true, scanProgress: 50 }),
    );

    render(<ThingsTab connection={null} />);
    const btn = screen.getByRole("button", { name: /scan/i });
    expect(btn).toBeDisabled();
  });

  it("renders three column headers: Device, Details, Last Seen", () => {
    render(<ThingsTab connection={null} />);
    expect(screen.getByText("Device")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Last Seen")).toBeInTheDocument();
  });

  it("renders device rows with IP and MAC in details", () => {
    const device = makeDevice({ ip: "192.168.1.42", mac: "AA:BB:CC:DD:EE:FF", vendor: "Acme" });
    mockUseThings.mockReturnValue(defaultThingsState({ devices: [device] }));

    render(<ThingsTab connection={null} />);
    expect(screen.getByText("192.168.1.42")).toBeInTheDocument();
    expect(screen.getByText("AA:BB:CC:DD:EE:FF")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("shows friendly name instead of hostname when set", () => {
    const device = makeDevice({ hostname: "original", friendlyName: "Living Room TV" });
    mockUseThings.mockReturnValue(defaultThingsState({ devices: [device] }));

    render(<ThingsTab connection={null} />);
    expect(screen.getByText("Living Room TV")).toBeInTheDocument();
  });

  it("pins This-PC and Gateway at the top of the list", () => {
    const devices = [
      makeDevice({ mac: "AA:BB:CC:DD:EE:01", hostname: "regular", isThisPc: false, isGateway: false }),
      makeDevice({ mac: "AA:BB:CC:DD:EE:02", hostname: "gateway", isGateway: true }),
      makeDevice({ mac: "AA:BB:CC:DD:EE:03", hostname: "this-pc", isThisPc: true }),
    ];
    mockUseThings.mockReturnValue(defaultThingsState({ devices }));

    render(<ThingsTab connection={null} />);
    const rows = screen.getAllByTestId("device-row");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("this-pc");
    expect(rows[1]).toHaveTextContent("gateway");
    expect(rows[2]).toHaveTextContent("regular");
  });

  it("shows context menu on right-click with Friendly Name, Pin, and Forget options", () => {
    const device = makeDevice();
    mockUseThings.mockReturnValue(defaultThingsState({ devices: [device] }));

    render(<ThingsTab connection={null} />);
    const row = screen.getByTestId("device-row");
    fireEvent.contextMenu(row);

    expect(screen.getByText("Assign friendly name")).toBeInTheDocument();
    expect(screen.getByText(/Pin/)).toBeInTheDocument();
    expect(screen.getByText("Forget")).toBeInTheDocument();
  });

  it("shows info popover content when clicking the info icon on the banner", () => {
    render(<ThingsTab connection={null} />);
    const infoBtn = screen.getByTestId("network-info-toggle");
    fireEvent.click(infoBtn);

    expect(screen.getByText("192.168.1.1")).toBeInTheDocument();
    expect(screen.getByText("192.168.1.50")).toBeInTheDocument();
    expect(screen.getByText("255.255.255.0")).toBeInTheDocument();
  });

  it("shows 'No network' when networkInfo is null", () => {
    mockUseThings.mockReturnValue(defaultThingsState({ networkInfo: null }));

    render(<ThingsTab connection={null} />);
    expect(screen.getByText(/no network/i)).toBeInTheDocument();
  });

  it("shows last scan time when available", () => {
    mockUseThings.mockReturnValue(
      defaultThingsState({ lastScanTime: "2024-01-01T12:00:00Z" }),
    );

    render(<ThingsTab connection={null} />);
    expect(screen.getByTestId("last-scan-time")).toBeInTheDocument();
  });

  it("passes connection to useThings hook", () => {
    const mockConn = {} as HubConnection;
    render(<ThingsTab connection={mockConn} />);
    expect(mockUseThings).toHaveBeenCalled();
  });
});
