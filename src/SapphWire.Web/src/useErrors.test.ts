import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useErrors } from "./useErrors";
import type { AppError } from "./types";

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

describe("useErrors", () => {
  let mockConn: ReturnType<typeof createMockConnection>;

  beforeEach(() => {
    mockConn = createMockConnection();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty errors when connection is null", () => {
    const { result } = renderHook(() => useErrors(null));
    expect(result.current.errors).toEqual([]);
  });

  it("subscribes to errors on mount", () => {
    renderHook(() =>
      useErrors(mockConn as unknown as Parameters<typeof useErrors>[0]),
    );
    expect(mockConn.invoke).toHaveBeenCalledWith("SubscribeErrors");
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useErrors(mockConn as unknown as Parameters<typeof useErrors>[0]),
    );
    unmount();
    expect(mockConn.invoke).toHaveBeenCalledWith("UnsubscribeErrors");
  });

  it("adds error on BackendError event", () => {
    const { result } = renderHook(() =>
      useErrors(mockConn as unknown as Parameters<typeof useErrors>[0]),
    );

    const error: AppError = {
      id: "err-1",
      message: "ETW session failed to start",
      timestamp: "2024-06-01T12:00:00.000Z",
    };

    act(() => {
      mockConn._emit("BackendError", error);
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe(
      "ETW session failed to start",
    );
  });

  it("accumulates multiple errors", () => {
    const { result } = renderHook(() =>
      useErrors(mockConn as unknown as Parameters<typeof useErrors>[0]),
    );

    act(() => {
      mockConn._emit("BackendError", {
        id: "err-1",
        message: "ETW failed",
        timestamp: "2024-06-01T12:00:00.000Z",
      });
    });

    act(() => {
      mockConn._emit("BackendError", {
        id: "err-2",
        message: "GeoIP missing",
        timestamp: "2024-06-01T12:01:00.000Z",
      });
    });

    expect(result.current.errors).toHaveLength(2);
  });

  it("dismiss removes the error by id", () => {
    const { result } = renderHook(() =>
      useErrors(mockConn as unknown as Parameters<typeof useErrors>[0]),
    );

    act(() => {
      mockConn._emit("BackendError", {
        id: "err-1",
        message: "ETW failed",
        timestamp: "2024-06-01T12:00:00.000Z",
      });
      mockConn._emit("BackendError", {
        id: "err-2",
        message: "GeoIP missing",
        timestamp: "2024-06-01T12:01:00.000Z",
      });
    });

    act(() => {
      result.current.dismiss("err-1");
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].id).toBe("err-2");
  });

  it("dismissAll clears all errors", () => {
    const { result } = renderHook(() =>
      useErrors(mockConn as unknown as Parameters<typeof useErrors>[0]),
    );

    act(() => {
      mockConn._emit("BackendError", {
        id: "err-1",
        message: "ETW failed",
        timestamp: "2024-06-01T12:00:00.000Z",
      });
      mockConn._emit("BackendError", {
        id: "err-2",
        message: "GeoIP missing",
        timestamp: "2024-06-01T12:01:00.000Z",
      });
    });

    act(() => {
      result.current.dismissAll();
    });

    expect(result.current.errors).toEqual([]);
  });

  it("registers and removes SignalR handlers", () => {
    const { unmount } = renderHook(() =>
      useErrors(mockConn as unknown as Parameters<typeof useErrors>[0]),
    );

    expect(mockConn.on).toHaveBeenCalledWith(
      "BackendError",
      expect.any(Function),
    );

    unmount();

    expect(mockConn.off).toHaveBeenCalledWith(
      "BackendError",
      expect.any(Function),
    );
  });

  it("does not add duplicate errors with same id", () => {
    const { result } = renderHook(() =>
      useErrors(mockConn as unknown as Parameters<typeof useErrors>[0]),
    );

    const error: AppError = {
      id: "err-1",
      message: "ETW failed",
      timestamp: "2024-06-01T12:00:00.000Z",
    };

    act(() => {
      mockConn._emit("BackendError", error);
      mockConn._emit("BackendError", error);
    });

    expect(result.current.errors).toHaveLength(1);
  });
});
