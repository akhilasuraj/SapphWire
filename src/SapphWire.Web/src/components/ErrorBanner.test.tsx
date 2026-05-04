import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ErrorBanner from "./ErrorBanner";
import type { AppError } from "../types";

describe("ErrorBanner", () => {
  it("renders nothing when errors array is empty", () => {
    const { container } = render(
      <ErrorBanner errors={[]} onDismiss={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders error message when errors are present", () => {
    const errors: AppError[] = [
      {
        id: "err-1",
        message: "ETW session failed to start",
        timestamp: "2024-06-01T12:00:00.000Z",
      },
    ];
    render(<ErrorBanner errors={errors} onDismiss={() => {}} />);
    expect(screen.getByText("ETW session failed to start")).toBeInTheDocument();
  });

  it("renders multiple errors", () => {
    const errors: AppError[] = [
      {
        id: "err-1",
        message: "ETW session failed",
        timestamp: "2024-06-01T12:00:00.000Z",
      },
      {
        id: "err-2",
        message: "GeoIP database missing",
        timestamp: "2024-06-01T12:01:00.000Z",
      },
    ];
    render(<ErrorBanner errors={errors} onDismiss={() => {}} />);
    expect(screen.getByText("ETW session failed")).toBeInTheDocument();
    expect(screen.getByText("GeoIP database missing")).toBeInTheDocument();
  });

  it("calls onDismiss with error id when dismiss button clicked", () => {
    const onDismiss = vi.fn();
    const errors: AppError[] = [
      {
        id: "err-1",
        message: "ETW session failed",
        timestamp: "2024-06-01T12:00:00.000Z",
      },
    ];
    render(<ErrorBanner errors={errors} onDismiss={onDismiss} />);

    const dismissBtn = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledWith("err-1");
  });

  it("has amber/warning styling", () => {
    const errors: AppError[] = [
      {
        id: "err-1",
        message: "Error occurred",
        timestamp: "2024-06-01T12:00:00.000Z",
      },
    ];
    render(<ErrorBanner errors={errors} onDismiss={() => {}} />);
    const banner = screen.getByTestId("error-banner");
    expect(banner.className).toContain("amber");
  });
});
