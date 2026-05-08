import type { ConnectionStatus as Status } from "../useSignalR";

const STATUS_CONFIG: Record<
  Status,
  { dot: string; bg: string; label: string }
> = {
  connected: { dot: "var(--mint-deep)", bg: "var(--mint)", label: "Connected" },
  connecting: {
    dot: "var(--butter-deep)",
    bg: "var(--butter)",
    label: "Connecting…",
  },
  disconnected: {
    dot: "var(--coral-deep)",
    bg: "var(--coral)",
    label: "Disconnected",
  },
};

interface Props {
  status: Status;
}

export default function ConnectionStatus({ status }: Props) {
  const { dot, bg, label } = STATUS_CONFIG[status];

  return (
    <span
      className="chip"
      style={{ background: bg }}
      data-testid="connection-status"
    >
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: dot,
          border: "2px solid var(--ink)",
        }}
        data-testid="status-dot"
      />
      <span data-testid="status-label">{label}</span>
    </span>
  );
}
