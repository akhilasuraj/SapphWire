import type { AppError } from "../types";

interface Props {
  errors: AppError[];
  onDismiss: (id: string) => void;
}

export default function ErrorBanner({ errors, onDismiss }: Props) {
  if (errors.length === 0) return null;

  return (
    <div data-testid="error-banner" style={{ marginBottom: 18 }}>
      {errors.map((error) => (
        <div
          key={error.id}
          className="card-tight"
          style={{
            background: "var(--coral)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700 }}>{error.message}</span>
          <button
            onClick={() => onDismiss(error.id)}
            className="pill"
            style={{ background: "var(--paper)", fontSize: 11 }}
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
