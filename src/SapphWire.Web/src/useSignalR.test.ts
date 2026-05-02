import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mock = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  handlers: {} as Record<string, (...args: unknown[]) => void>,
  reconnectingCb: null as (() => void) | null,
  reconnectedCb: null as (() => void) | null,
  closeCb: null as (() => void) | null,
}));

const mockConnection = {
  on(event: string, handler: (...args: unknown[]) => void) {
    mock.handlers[event] = handler;
    mock.on(event, handler);
  },
  off: mock.off,
  onreconnecting(cb: () => void) {
    mock.reconnectingCb = cb;
  },
  onreconnected(cb: () => void) {
    mock.reconnectedCb = cb;
  },
  onclose(cb: () => void) {
    mock.closeCb = cb;
  },
  start: () => mock.start(),
  stop: () => mock.stop(),
  invoke: mock.invoke,
};

vi.mock("@microsoft/signalr", () => ({
  HubConnectionBuilder: class {
    withUrl() {
      return this;
    }
    withAutomaticReconnect() {
      return this;
    }
    configureLogging() {
      return this;
    }
    build() {
      return mockConnection;
    }
  },
  LogLevel: { Information: 1 },
}));

import { useSignalR } from "./useSignalR";

describe("useSignalR", () => {
  beforeEach(() => {
    mock.start.mockReset().mockResolvedValue(undefined);
    mock.stop.mockReset().mockResolvedValue(undefined);
    mock.invoke.mockReset().mockResolvedValue(undefined);
    mock.on.mockReset();
    mock.off.mockReset();
    mock.handlers = {};
    mock.reconnectingCb = null;
    mock.reconnectedCb = null;
    mock.closeCb = null;
  });

  it("resolves to connected after successful start", async () => {
    const { result } = renderHook(() => useSignalR("/hubs/test"));
    await waitFor(() => {
      expect(result.current.status).toBe("connected");
    });
  });

  it("exposes connection object", async () => {
    const { result } = renderHook(() => useSignalR("/hubs/test"));
    await waitFor(() => {
      expect(result.current.status).toBe("connected");
    });
    expect(result.current.connection).toBe(mockConnection);
  });

  it("resolves to disconnected when start fails", async () => {
    mock.start.mockRejectedValue(new Error("connection failed"));
    const { result } = renderHook(() => useSignalR("/hubs/test"));
    await waitFor(() => {
      expect(result.current.status).toBe("disconnected");
    });
  });

  it("transitions to connecting on reconnecting event", async () => {
    const { result } = renderHook(() => useSignalR("/hubs/test"));
    await waitFor(() => expect(result.current.status).toBe("connected"));

    act(() => {
      mock.reconnectingCb?.();
    });
    expect(result.current.status).toBe("connecting");
  });

  it("returns to connected on reconnected event", async () => {
    const { result } = renderHook(() => useSignalR("/hubs/test"));
    await waitFor(() => expect(result.current.status).toBe("connected"));

    act(() => {
      mock.reconnectingCb?.();
    });
    expect(result.current.status).toBe("connecting");

    act(() => {
      mock.reconnectedCb?.();
    });
    expect(result.current.status).toBe("connected");
  });

  it("sets disconnected on close event", async () => {
    const { result } = renderHook(() => useSignalR("/hubs/test"));
    await waitFor(() => expect(result.current.status).toBe("connected"));

    act(() => {
      mock.closeCb?.();
    });
    expect(result.current.status).toBe("disconnected");
  });

  it("stops connection on unmount", async () => {
    const { result, unmount } = renderHook(() => useSignalR("/hubs/test"));
    await waitFor(() => expect(result.current.status).toBe("connected"));

    unmount();
    expect(mock.stop).toHaveBeenCalled();
  });
});
