const PORT_MAP: Record<number, string> = {
  21: "FTP",
  22: "SSH",
  25: "SMTP",
  53: "DNS",
  67: "DHCP",
  68: "DHCP",
  80: "HTTP",
  110: "POP3",
  123: "NTP",
  143: "IMAP",
  443: "HTTPS",
  445: "SMB",
  465: "SMTPS",
  587: "SMTP",
  853: "DoT",
  993: "IMAPS",
  995: "POP3S",
  1900: "SSDP",
  3389: "RDP",
  3478: "STUN",
  5228: "GCM",
  5353: "mDNS",
  8080: "HTTP Alt",
  8443: "HTTPS Alt",
};

export function portToProtocol(port: number): string {
  return PORT_MAP[port] ?? "Other";
}
