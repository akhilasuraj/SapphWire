import type { ConnectionStatus as Status } from "../useSignalR";

const STATUS_CONFIG: Record<Status, { color: string; label: string }> = {
  connected: { color: "bg-emerald-500", label: "Connected" },
  connecting: { color: "bg-yellow-500", label: "Connecting…" },
  disconnected: { color: "bg-red-500", label: "Disconnected" },
};

interface Props {
  status: Status;
}

export default function ConnectionStatus({ status }: Props) {
  const { color, label } = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-2 text-sm" data-testid="connection-status">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
        data-testid="status-dot"
      />
      <span data-testid="status-label">{label}</span>
    </div>
  );
}
