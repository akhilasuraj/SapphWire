import { useState } from "react";
import TopBar from "./components/TopBar";
import ConnectionStatus from "./components/ConnectionStatus";
import ErrorBanner from "./components/ErrorBanner";
import SettingsPanel from "./components/SettingsPanel";
import GraphTab from "./components/GraphTab";
import UsageTab from "./components/UsageTab";
import FirewallTab from "./components/FirewallTab";
import AlertsTab from "./components/AlertsTab";
import ThingsTab from "./components/ThingsTab";
import { useSignalR } from "./useSignalR";
import { useErrors } from "./useErrors";

export type TabName = "Graph" | "Usage" | "Things" | "Firewall" | "Alerts";

const HUB_URL = "/hubs/dashboard";

export default function App() {
  const { status, connection } = useSignalR(HUB_URL);
  const [activeTab, setActiveTab] = useState<TabName>("Graph");
  const [showSettings, setShowSettings] = useState(false);

  const connectedConnection = status === "connected" ? connection : null;
  const { errors, dismiss } = useErrors(connectedConnection);

  function renderTab() {
    switch (activeTab) {
      case "Graph":
        return <GraphTab connection={connectedConnection} />;
      case "Usage":
        return <UsageTab connection={connectedConnection} />;
      case "Things":
        return <ThingsTab connection={connectedConnection} />;
      case "Firewall":
        return <FirewallTab connection={connectedConnection} />;
      case "Alerts":
        return (
          <AlertsTab
            connection={connectedConnection}
            onNavigateToAlert={() => {}}
          />
        );
      default:
        return (
          <div className="flex-1 flex items-center justify-center">
            <ConnectionStatus status={status} />
          </div>
        );
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSettingsClick={() => setShowSettings(true)}
      />
      <ErrorBanner errors={errors} onDismiss={dismiss} />
      <main className="flex-1 flex flex-col">{renderTab()}</main>
      {showSettings && (
        <SettingsPanel
          connection={connectedConnection}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
