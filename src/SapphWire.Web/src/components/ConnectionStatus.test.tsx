import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ConnectionStatus from "./ConnectionStatus";

describe("ConnectionStatus", () => {
  it("shows 'Connected' with green dot when connected", () => {
    render(<ConnectionStatus status="connected" />);
    expect(screen.getByTestId("status-label")).toHaveTextContent("Connected");
    expect(screen.getByTestId("status-dot")).toHaveClass("bg-emerald-500");
  });

  it("shows 'Connecting…' with yellow dot when connecting", () => {
    render(<ConnectionStatus status="connecting" />);
    expect(screen.getByTestId("status-label")).toHaveTextContent("Connecting…");
    expect(screen.getByTestId("status-dot")).toHaveClass("bg-yellow-500");
  });

  it("shows 'Disconnected' with red dot when disconnected", () => {
    render(<ConnectionStatus status="disconnected" />);
    expect(screen.getByTestId("status-label")).toHaveTextContent(
      "Disconnected",
    );
    expect(screen.getByTestId("status-dot")).toHaveClass("bg-red-500");
  });
});
