import { useState } from "react";
import TopBar from "./components/TopBar";
import ConnectionStatus from "./components/ConnectionStatus";
import GraphTab from "./components/GraphTab";
import FirewallTab from "./components/FirewallTab";
import AlertsTab from "./components/AlertsTab";
import { useSignalR } from "./useSignalR";
import { useAlerts } from "./useAlerts";

export type TabName = "Graph" | "Usage" | "Things" | "Firewall" | "Alerts";

const HUB_URL = "/hubs/dashboard";

export default function App() {
  const { status, connection } = useSignalR(HUB_URL);
  const [activeTab, setActiveTab] = useState<TabName>("Graph");

  const connectedConnection = status === "connected" ? connection : null;
  const { alertTimestamps } = useAlerts(connectedConnection);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <TopBar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 flex flex-col">
        {activeTab === "Graph" ? (
          <GraphTab
            connection={connectedConnection}
            alertTimestamps={alertTimestamps}
          />
        ) : activeTab === "Firewall" ? (
          <FirewallTab connection={connectedConnection} />
        ) : activeTab === "Alerts" ? (
          <AlertsTab
            connection={connectedConnection}
            onNavigateToAlert={() => {}}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <ConnectionStatus status={status} />
          </div>
        )}
      </main>
    </div>
  );
}
