import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  useFirewall,
  type BlockedAppInfo,
  type FirewallState,
} from "./useFirewall";

function makeBlockedApp(
  overrides: Partial<BlockedAppInfo> = {},
): BlockedAppInfo {
  return {
    appId: "Chrome",
    displayName: "Chrome",
    blockedExePaths: ["C:\\Program Files\\Google\\Chrome\\chrome.exe"],
    ...overrides,
  };
}

function createMockConnection() {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (handlers[event]) {
        handlers[event] = handlers[event].filter((h) => h !== handler);
      }
    }),
    invoke: vi.fn(() => Promise.resolve()),
    _emit(event: string, ...args: unknown[]) {
      (handlers[event] || []).forEach((h) => h(...args));
    },
  };
}

describe("useFirewall", () => {
  let mockConn: ReturnType<typeof createMockConnection>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockConn = createMockConnection();
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ blockedApps: [] }),
    });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty blocked apps when connection is null", () => {
    const { result } = renderHook(() => useFirewall(null));
    expect(result.current.state.blockedApps).toEqual([]);
    expect(result.current.state.error).toBeNull();
  });

  it("fetches initial firewall state on mount", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          blockedApps: [makeBlockedApp()],
        }),
    });

    const { result } = renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );

    await vi.waitFor(() => {
      expect(result.current.state.blockedApps).toHaveLength(1);
    });
    expect(result.current.state.blockedApps[0].appId).toBe("Chrome");
  });

  it("subscribes to firewall SignalR group on mount", () => {
    renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );
    expect(mockConn.invoke).toHaveBeenCalledWith("SubscribeFirewall");
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );
    unmount();
    expect(mockConn.invoke).toHaveBeenCalledWith("UnsubscribeFirewall");
  });

  it("updates state on FirewallStateSnapshot", () => {
    const { result } = renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );

    const state: FirewallState = {
      blockedApps: [makeBlockedApp({ appId: "Discord" })],
    };

    act(() => {
      mockConn._emit("FirewallStateSnapshot", state);
    });

    expect(result.current.state.blockedApps).toHaveLength(1);
    expect(result.current.state.blockedApps[0].appId).toBe("Discord");
  });

  it("updates state on FirewallStateChanged", () => {
    const { result } = renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );

    act(() => {
      mockConn._emit("FirewallStateChanged", {
        blockedApps: [
          makeBlockedApp({ appId: "Slack" }),
          makeBlockedApp({ appId: "Discord" }),
        ],
      });
    });

    expect(result.current.state.blockedApps).toHaveLength(2);
  });

  it("blockApp calls POST /api/firewall/block with appId", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ blockedApps: [] }),
    });

    const { result } = renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );

    await act(async () => {
      await result.current.blockApp("Chrome");
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/firewall/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId: "Chrome" }),
    });
  });

  it("unblockApp calls POST /api/firewall/unblock with appId", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ blockedApps: [] }),
    });

    const { result } = renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );

    await act(async () => {
      await result.current.unblockApp("Chrome");
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/firewall/unblock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId: "Chrome" }),
    });
  });

  it("blockExe calls POST /api/firewall/block with appId and exePath", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ blockedApps: [] }),
    });

    const { result } = renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );

    await act(async () => {
      await result.current.blockExe("Chrome", "C:\\chrome.exe");
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/firewall/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId: "Chrome", exePath: "C:\\chrome.exe" }),
    });
  });

  it("unblockExe calls POST /api/firewall/unblock with appId and exePath", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ blockedApps: [] }),
    });

    const { result } = renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );

    await act(async () => {
      await result.current.unblockExe("Chrome", "C:\\chrome.exe");
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/firewall/unblock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId: "Chrome", exePath: "C:\\chrome.exe" }),
    });
  });

  it("sets error on block failure", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ blockedApps: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("COM error: access denied"),
      });

    const { result } = renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );

    await act(async () => {
      await result.current.blockApp("Chrome");
    });

    expect(result.current.state.error).toBe(
      "Firewall operation failed: COM error: access denied",
    );
  });

  it("clears error on successful operation", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ blockedApps: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("error"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ blockedApps: [] }),
      });

    const { result } = renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );

    await act(async () => {
      await result.current.blockApp("Chrome");
    });
    expect(result.current.state.error).toBeTruthy();

    await act(async () => {
      await result.current.unblockApp("Chrome");
    });
    expect(result.current.state.error).toBeNull();
  });

  it("isBlocked returns true for blocked app", () => {
    const { result } = renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );

    act(() => {
      mockConn._emit("FirewallStateSnapshot", {
        blockedApps: [makeBlockedApp({ appId: "Chrome" })],
      });
    });

    expect(result.current.isBlocked("Chrome")).toBe(true);
    expect(result.current.isBlocked("Discord")).toBe(false);
  });

  it("isExeBlocked returns true for blocked exe path", () => {
    const { result } = renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );

    act(() => {
      mockConn._emit("FirewallStateSnapshot", {
        blockedApps: [
          makeBlockedApp({
            appId: "Chrome",
            blockedExePaths: ["C:\\chrome.exe", "C:\\helper.exe"],
          }),
        ],
      });
    });

    expect(result.current.isExeBlocked("Chrome", "C:\\chrome.exe")).toBe(true);
    expect(result.current.isExeBlocked("Chrome", "C:\\other.exe")).toBe(false);
    expect(result.current.isExeBlocked("Discord", "C:\\chrome.exe")).toBe(
      false,
    );
  });

  it("registers and removes SignalR handlers", () => {
    const { unmount } = renderHook(() =>
      useFirewall(
        mockConn as unknown as Parameters<typeof useFirewall>[0],
      ),
    );

    expect(mockConn.on).toHaveBeenCalledWith(
      "FirewallStateSnapshot",
      expect.any(Function),
    );
    expect(mockConn.on).toHaveBeenCalledWith(
      "FirewallStateChanged",
      expect.any(Function),
    );

    unmount();

    expect(mockConn.off).toHaveBeenCalledWith(
      "FirewallStateSnapshot",
      expect.any(Function),
    );
    expect(mockConn.off).toHaveBeenCalledWith(
      "FirewallStateChanged",
      expect.any(Function),
    );
  });
});
