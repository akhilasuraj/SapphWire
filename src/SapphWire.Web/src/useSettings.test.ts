import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSettings } from "./useSettings";

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

describe("useSettings", () => {
  let mockConn: ReturnType<typeof createMockConnection>;

  beforeEach(() => {
    mockConn = createMockConnection();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns default settings when connection is null", () => {
    const { result } = renderHook(() => useSettings(null));
    expect(result.current.settings).toEqual({
      autostartEnabled: true,
      toastEnabled: true,
    });
    expect(result.current.info).toBeNull();
  });

  it("subscribes to settings on mount", () => {
    renderHook(() =>
      useSettings(mockConn as unknown as Parameters<typeof useSettings>[0]),
    );
    expect(mockConn.invoke).toHaveBeenCalledWith("SubscribeSettings");
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useSettings(mockConn as unknown as Parameters<typeof useSettings>[0]),
    );
    unmount();
    expect(mockConn.invoke).toHaveBeenCalledWith("UnsubscribeSettings");
  });

  it("populates settings on SettingsSnapshot", () => {
    const { result } = renderHook(() =>
      useSettings(mockConn as unknown as Parameters<typeof useSettings>[0]),
    );

    act(() => {
      mockConn._emit("SettingsSnapshot", {
        settings: { autostartEnabled: false, toastEnabled: true },
        dbPath: "C:\\Users\\test\\AppData\\Local\\SapphWire\\sapphwire.db",
        dbSizeBytes: 1048576,
        version: "1.0.0",
        buildHash: "abc123",
        logsPath: "C:\\Users\\test\\AppData\\Local\\SapphWire\\logs",
      });
    });

    expect(result.current.settings.autostartEnabled).toBe(false);
    expect(result.current.settings.toastEnabled).toBe(true);
    expect(result.current.info).not.toBeNull();
    expect(result.current.info!.dbSizeBytes).toBe(1048576);
    expect(result.current.info!.version).toBe("1.0.0");
  });

  it("updates settings on SettingsChanged", () => {
    const { result } = renderHook(() =>
      useSettings(mockConn as unknown as Parameters<typeof useSettings>[0]),
    );

    act(() => {
      mockConn._emit("SettingsSnapshot", {
        settings: { autostartEnabled: true, toastEnabled: true },
        dbPath: "path",
        dbSizeBytes: 0,
        version: "1.0.0",
        buildHash: "abc",
        logsPath: "logs",
      });
    });

    act(() => {
      mockConn._emit("SettingsChanged", {
        autostartEnabled: false,
        toastEnabled: false,
      });
    });

    expect(result.current.settings.autostartEnabled).toBe(false);
    expect(result.current.settings.toastEnabled).toBe(false);
  });

  it("setAutostart invokes hub method", async () => {
    mockConn.invoke.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSettings(mockConn as unknown as Parameters<typeof useSettings>[0]),
    );

    await act(async () => {
      await result.current.setAutostart(false);
    });

    expect(mockConn.invoke).toHaveBeenCalledWith("SetAutostart", false);
  });

  it("setToastEnabled invokes hub method", async () => {
    mockConn.invoke.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSettings(mockConn as unknown as Parameters<typeof useSettings>[0]),
    );

    await act(async () => {
      await result.current.setToastEnabled(false);
    });

    expect(mockConn.invoke).toHaveBeenCalledWith("SetToastEnabled", false);
  });

  it("clearData invokes hub method", async () => {
    mockConn.invoke.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSettings(mockConn as unknown as Parameters<typeof useSettings>[0]),
    );

    await act(async () => {
      await result.current.clearData();
    });

    expect(mockConn.invoke).toHaveBeenCalledWith("ClearData");
  });

  it("pauseMonitoring invokes hub method", async () => {
    mockConn.invoke.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSettings(mockConn as unknown as Parameters<typeof useSettings>[0]),
    );

    await act(async () => {
      await result.current.pauseMonitoring();
    });

    expect(mockConn.invoke).toHaveBeenCalledWith("PauseMonitoring");
  });

  it("resumeMonitoring invokes hub method", async () => {
    mockConn.invoke.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSettings(mockConn as unknown as Parameters<typeof useSettings>[0]),
    );

    await act(async () => {
      await result.current.resumeMonitoring();
    });

    expect(mockConn.invoke).toHaveBeenCalledWith("ResumeMonitoring");
  });

  it("registers and removes SignalR handlers on mount/unmount", () => {
    const { unmount } = renderHook(() =>
      useSettings(mockConn as unknown as Parameters<typeof useSettings>[0]),
    );

    expect(mockConn.on).toHaveBeenCalledWith(
      "SettingsSnapshot",
      expect.any(Function),
    );
    expect(mockConn.on).toHaveBeenCalledWith(
      "SettingsChanged",
      expect.any(Function),
    );

    unmount();

    expect(mockConn.off).toHaveBeenCalledWith(
      "SettingsSnapshot",
      expect.any(Function),
    );
    expect(mockConn.off).toHaveBeenCalledWith(
      "SettingsChanged",
      expect.any(Function),
    );
  });

  it("isPaused defaults to false and updates on SettingsSnapshot", () => {
    const { result } = renderHook(() =>
      useSettings(mockConn as unknown as Parameters<typeof useSettings>[0]),
    );

    expect(result.current.isPaused).toBe(false);
  });

  it("updates isPaused on MonitoringStateChanged", () => {
    const { result } = renderHook(() =>
      useSettings(mockConn as unknown as Parameters<typeof useSettings>[0]),
    );

    act(() => {
      mockConn._emit("MonitoringStateChanged", true);
    });

    expect(result.current.isPaused).toBe(true);
  });
});
