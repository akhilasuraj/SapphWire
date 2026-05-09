import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useHostnames } from "./useHostnames";

function createMockConnection() {
  return {
    invoke: vi.fn().mockResolvedValue({}),
    on: vi.fn(),
    off: vi.fn(),
  };
}

type Conn = Parameters<typeof useHostnames>[0];

describe("useHostnames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty map when connection is null", () => {
    const { result } = renderHook(() => useHostnames(null, []));
    expect(result.current).toEqual({});
  });

  it("returns empty map when ips list is empty", () => {
    const conn = createMockConnection();
    const { result } = renderHook(() =>
      useHostnames(conn as unknown as Conn, []),
    );
    expect(result.current).toEqual({});
  });

  it("calls ResolveHostnames on hub with IP list", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue({ "1.2.3.4": "host.example.com" });

    renderHook(() =>
      useHostnames(conn as unknown as Conn, ["1.2.3.4"]),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledWith("ResolveHostnames", [
        "1.2.3.4",
      ]);
    });
  });

  it("returns resolved hostnames", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue({
      "1.2.3.4": "host.example.com",
      "5.6.7.8": "other.example.com",
    });

    const { result } = renderHook(() =>
      useHostnames(conn as unknown as Conn, ["1.2.3.4", "5.6.7.8"]),
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        "1.2.3.4": "host.example.com",
        "5.6.7.8": "other.example.com",
      });
    });
  });

  it("preserves previously resolved hostnames when IPs change", async () => {
    const conn = createMockConnection();
    conn.invoke
      .mockResolvedValueOnce({ "1.2.3.4": "host.example.com" })
      .mockResolvedValueOnce({ "5.6.7.8": "other.example.com" });

    const { result, rerender } = renderHook(
      ({ ips }: { ips: string[] }) =>
        useHostnames(conn as unknown as Conn, ips),
      { initialProps: { ips: ["1.2.3.4"] } },
    );

    await waitFor(() => {
      expect(result.current["1.2.3.4"]).toBe("host.example.com");
    });

    rerender({ ips: ["5.6.7.8"] });

    await waitFor(() => {
      expect(result.current["5.6.7.8"]).toBe("other.example.com");
      expect(result.current["1.2.3.4"]).toBe("host.example.com");
    });
  });

  it("handles invoke failure gracefully", async () => {
    const conn = createMockConnection();
    conn.invoke.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() =>
      useHostnames(conn as unknown as Conn, ["1.2.3.4"]),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalled();
    });

    expect(result.current).toEqual({});
  });

  it("does not call hub when connection is null even with IPs", () => {
    const { result } = renderHook(() =>
      useHostnames(null, ["1.2.3.4"]),
    );
    expect(result.current).toEqual({});
  });
});
