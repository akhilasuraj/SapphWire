import { describe, it, expect } from "vitest";
import { portToProtocol } from "./portProtocol";

describe("portToProtocol", () => {
  it("maps 443 to HTTPS", () => {
    expect(portToProtocol(443)).toBe("HTTPS");
  });

  it("maps 80 to HTTP", () => {
    expect(portToProtocol(80)).toBe("HTTP");
  });

  it("maps 53 to DNS", () => {
    expect(portToProtocol(53)).toBe("DNS");
  });

  it("maps 22 to SSH", () => {
    expect(portToProtocol(22)).toBe("SSH");
  });

  it("maps 5353 to mDNS", () => {
    expect(portToProtocol(5353)).toBe("mDNS");
  });

  it("maps 1900 to SSDP", () => {
    expect(portToProtocol(1900)).toBe("SSDP");
  });

  it("maps unknown port to Other", () => {
    expect(portToProtocol(59123)).toBe("Other");
  });

  it("maps 3389 to RDP", () => {
    expect(portToProtocol(3389)).toBe("RDP");
  });

  it("maps 853 to DoT", () => {
    expect(portToProtocol(853)).toBe("DoT");
  });

  it("maps 21 to FTP", () => {
    expect(portToProtocol(21)).toBe("FTP");
  });
});
