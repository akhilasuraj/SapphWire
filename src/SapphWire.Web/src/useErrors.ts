import { useState, useEffect, useCallback } from "react";
import type { HubConnection } from "@microsoft/signalr";
import type { AppError } from "./types";

export interface ErrorsHookResult {
  errors: AppError[];
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export function useErrors(connection: HubConnection | null): ErrorsHookResult {
  const [errors, setErrors] = useState<AppError[]>([]);

  const onError = useCallback((error: AppError) => {
    setErrors((prev) => {
      if (prev.some((e) => e.id === error.id)) return prev;
      return [...prev, error];
    });
  }, []);

  useEffect(() => {
    if (!connection) return;

    connection.on("BackendError", onError);
    connection.invoke("SubscribeErrors").catch(() => {});

    return () => {
      connection.invoke("UnsubscribeErrors").catch(() => {});
      connection.off("BackendError", onError);
      setErrors([]);
    };
  }, [connection, onError]);

  const dismiss = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setErrors([]);
  }, []);

  return { errors, dismiss, dismissAll };
}
