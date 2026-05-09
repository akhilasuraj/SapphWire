import { useState, useCallback } from "react";

export type NetworkScope = "All" | "Lan" | "Wan";

export function useNetworkScope() {
  const [scope, setScope] = useState<NetworkScope>("All");

  const changeScope = useCallback((newScope: NetworkScope) => {
    setScope(newScope);
  }, []);

  return { scope, changeScope } as const;
}
