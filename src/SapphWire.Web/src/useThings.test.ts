import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useThings } from "./useThings";
import type { Device, NetworkInfo, ThingsSnapshot, ScanProgress } from "./types";

function createMockConnection() {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    invoke: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler;
    }),
    off: vi.fn(),
    _handlers: handlers,
  };
}

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
    lastSeen: "2024-01-01T00:00:00Z",
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

describe("useThings", () => {
  let conn: ReturnType<typeof createMockConnection>;

  beforeEach(() => {
    conn = createMockConnection();
  });

  it("returns empty state when connection is null", () => {
    const { result } = renderHook(() => useThings(null));
    expect(result.current.devices).toEqual([]);
    expect(result.current.networkInfo).toBeNull();
    expect(result.current.scanning).toBe(false);
    expect(result.current.lastScanTime).toBeNull();
  });

  it("subscribes to Things on mount", async () => {
    renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledWith("SubscribeThings");
    });
  });

  it("registers all Things event handlers", () => {
    renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    expect(conn.on).toHaveBeenCalledWith("ThingsSnapshot", expect.any(Function));
    expect(conn.on).toHaveBeenCalledWith("DeviceUpdate", expect.any(Function));
    expect(conn.on).toHaveBeenCalledWith("DeviceRemove", expect.any(Function));
    expect(conn.on).toHaveBeenCalledWith("NetworkInfoUpdate", expect.any(Function));
    expect(conn.on).toHaveBeenCalledWith("ScanProgress", expect.any(Function));
  });

  it("populates state from ThingsSnapshot", () => {
    const { result } = renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    const device = makeDevice();
    const snapshot: ThingsSnapshot = {
      devices: [device],
      networkInfo: defaultNetworkInfo,
      scanning: false,
      lastScanTime: null,
    };

    act(() => {
      conn._handlers["ThingsSnapshot"](snapshot);
    });

    expect(result.current.devices).toEqual([device]);
    expect(result.current.networkInfo).toEqual(defaultNetworkInfo);
    expect(result.current.scanning).toBe(false);
  });

  it("adds a new device via DeviceUpdate", () => {
    const { result } = renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    const device = makeDevice();

    act(() => {
      conn._handlers["DeviceUpdate"](device);
    });

    expect(result.current.devices).toHaveLength(1);
    expect(result.current.devices[0]).toEqual(device);
  });

  it("updates an existing device via DeviceUpdate (keyed by MAC)", () => {
    const { result } = renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    const device = makeDevice({ hostname: "old-name" });

    act(() => {
      conn._handlers["DeviceUpdate"](device);
    });

    const updated = makeDevice({ hostname: "new-name" });

    act(() => {
      conn._handlers["DeviceUpdate"](updated);
    });

    expect(result.current.devices).toHaveLength(1);
    expect(result.current.devices[0].hostname).toBe("new-name");
  });

  it("removes a device via DeviceRemove", () => {
    const { result } = renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    const device = makeDevice();

    act(() => {
      conn._handlers["DeviceUpdate"](device);
    });

    expect(result.current.devices).toHaveLength(1);

    act(() => {
      conn._handlers["DeviceRemove"](device.mac);
    });

    expect(result.current.devices).toHaveLength(0);
  });

  it("updates network info via NetworkInfoUpdate", () => {
    const { result } = renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    act(() => {
      conn._handlers["NetworkInfoUpdate"](defaultNetworkInfo);
    });

    expect(result.current.networkInfo).toEqual(defaultNetworkInfo);
  });

  it("updates scan state via ScanProgress", () => {
    const { result } = renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    const progress: ScanProgress = {
      scanning: true,
      progress: 50,
      lastScanTime: null,
    };

    act(() => {
      conn._handlers["ScanProgress"](progress);
    });

    expect(result.current.scanning).toBe(true);
    expect(result.current.scanProgress).toBe(50);
  });

  it("sends StartScan invoke when requestScan is called", async () => {
    const { result } = renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    await act(async () => {
      result.current.requestScan();
    });

    expect(conn.invoke).toHaveBeenCalledWith("StartScan");
  });

  it("sends SetFriendlyName invoke", async () => {
    const { result } = renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    await act(async () => {
      result.current.setFriendlyName("AA:BB:CC:DD:EE:FF", "Living Room TV");
    });

    expect(conn.invoke).toHaveBeenCalledWith(
      "SetFriendlyName",
      "AA:BB:CC:DD:EE:FF",
      "Living Room TV",
    );
  });

  it("sends TogglePin invoke", async () => {
    const { result } = renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    await act(async () => {
      result.current.togglePin("AA:BB:CC:DD:EE:FF");
    });

    expect(conn.invoke).toHaveBeenCalledWith("TogglePin", "AA:BB:CC:DD:EE:FF");
  });

  it("sends ForgetDevice invoke", async () => {
    const { result } = renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    await act(async () => {
      result.current.forgetDevice("AA:BB:CC:DD:EE:FF");
    });

    expect(conn.invoke).toHaveBeenCalledWith("ForgetDevice", "AA:BB:CC:DD:EE:FF");
  });

  it("unsubscribes and cleans up on unmount", () => {
    const { unmount } = renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    unmount();

    expect(conn.invoke).toHaveBeenCalledWith("UnsubscribeThings");
    expect(conn.off).toHaveBeenCalledWith("ThingsSnapshot", expect.any(Function));
    expect(conn.off).toHaveBeenCalledWith("DeviceUpdate", expect.any(Function));
    expect(conn.off).toHaveBeenCalledWith("DeviceRemove", expect.any(Function));
    expect(conn.off).toHaveBeenCalledWith("NetworkInfoUpdate", expect.any(Function));
    expect(conn.off).toHaveBeenCalledWith("ScanProgress", expect.any(Function));
  });

  it("clears state and resubscribes when connection changes", () => {
    const conn2 = createMockConnection();

    const { result, rerender } = renderHook(
      ({ c }) =>
        useThings(c as unknown as Parameters<typeof useThings>[0]),
      { initialProps: { c: conn } },
    );

    act(() => {
      conn._handlers["DeviceUpdate"](makeDevice());
    });

    expect(result.current.devices).toHaveLength(1);

    rerender({ c: conn2 });

    expect(result.current.devices).toEqual([]);
    expect(conn.invoke).toHaveBeenCalledWith("UnsubscribeThings");
    expect(conn2.invoke).toHaveBeenCalledWith("SubscribeThings");
  });

  it("handles subscribe invoke rejection without crashing", () => {
    const failConn = createMockConnection();
    failConn.invoke.mockRejectedValue(new Error("Not connected"));

    const { result } = renderHook(() =>
      useThings(failConn as unknown as Parameters<typeof useThings>[0]),
    );

    expect(result.current.devices).toEqual([]);
  });

  it("handles action invoke rejection without crashing", async () => {
    conn.invoke.mockResolvedValueOnce(undefined); // SubscribeThings
    conn.invoke.mockRejectedValue(new Error("Connection lost"));

    const { result } = renderHook(() =>
      useThings(conn as unknown as Parameters<typeof useThings>[0]),
    );

    await act(async () => {
      result.current.requestScan();
    });

    // Should not throw
    expect(result.current.devices).toEqual([]);
  });
});
