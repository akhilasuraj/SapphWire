import { useState } from "react";

export type NetworkScope = "All" | "Lan" | "Wan";

export function useNetworkScope() {
  const [scope, changeScope] = useState<NetworkScope>("All");
  return { scope, changeScope } as const;
}
