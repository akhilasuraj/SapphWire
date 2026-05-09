import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useNetworkScope } from "./useNetworkScope";

describe("useNetworkScope", () => {
  it("defaults to All scope", () => {
    const { result } = renderHook(() => useNetworkScope());
    expect(result.current.scope).toBe("All");
  });

  it("changes scope to Lan", () => {
    const { result } = renderHook(() => useNetworkScope());
    act(() => result.current.changeScope("Lan"));
    expect(result.current.scope).toBe("Lan");
  });

  it("changes scope to Wan", () => {
    const { result } = renderHook(() => useNetworkScope());
    act(() => result.current.changeScope("Wan"));
    expect(result.current.scope).toBe("Wan");
  });

  it("changes scope back to All", () => {
    const { result } = renderHook(() => useNetworkScope());
    act(() => result.current.changeScope("Wan"));
    act(() => result.current.changeScope("All"));
    expect(result.current.scope).toBe("All");
  });
});
