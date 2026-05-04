import type { AppError } from "../types";

interface Props {
  errors: AppError[];
  onDismiss: (id: string) => void;
}

export default function ErrorBanner({ errors, onDismiss }: Props) {
  if (errors.length === 0) return null;

  return (
    <div
      data-testid="error-banner"
      className="bg-amber-900/80 border-b border-amber-700 px-4 py-2"
    >
      {errors.map((error) => (
        <div
          key={error.id}
          className="flex items-center justify-between text-sm text-amber-100"
        >
          <span>{error.message}</span>
          <button
            onClick={() => onDismiss(error.id)}
            className="ml-4 text-amber-300 hover:text-amber-100 text-xs"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
