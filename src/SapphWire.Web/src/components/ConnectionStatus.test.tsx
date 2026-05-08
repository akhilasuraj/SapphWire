import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ConnectionStatus from "./ConnectionStatus";

describe("ConnectionStatus", () => {
  it("shows 'Connected' with mint dot when connected", () => {
    render(<ConnectionStatus status="connected" />);
    expect(screen.getByTestId("status-label")).toHaveTextContent("Connected");
    expect(screen.getByTestId("status-dot").style.background).toContain(
      "--mint-deep",
    );
  });

  it("shows 'Connecting…' with butter dot when connecting", () => {
    render(<ConnectionStatus status="connecting" />);
    expect(screen.getByTestId("status-label")).toHaveTextContent("Connecting…");
    expect(screen.getByTestId("status-dot").style.background).toContain(
      "--butter-deep",
    );
  });

  it("shows 'Disconnected' with coral dot when disconnected", () => {
    render(<ConnectionStatus status="disconnected" />);
    expect(screen.getByTestId("status-label")).toHaveTextContent(
      "Disconnected",
    );
    expect(screen.getByTestId("status-dot").style.background).toContain(
      "--coral-deep",
    );
  });
});
