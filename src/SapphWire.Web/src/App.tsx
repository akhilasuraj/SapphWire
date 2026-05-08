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
import { useAlerts } from "./useAlerts";

export type TabName = "Graph" | "Usage" | "Things" | "Firewall" | "Alerts";

const HUB_URL = "/hubs/dashboard";

export default function App() {
  const { status, connection } = useSignalR(HUB_URL);
  const [activeTab, setActiveTab] = useState<TabName>("Graph");
  const [showSettings, setShowSettings] = useState(false);

  const connectedConnection = status === "connected" ? connection : null;
  const { errors, dismiss } = useErrors(connectedConnection);
  const { unreadCount } = useAlerts(connectedConnection);

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
    }
  }

  return (
    <div className="app">
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSettingsClick={() => setShowSettings(true)}
        connectionStatus={status}
        alertsCount={unreadCount}
      />
      <ErrorBanner errors={errors} onDismiss={dismiss} />
      <main key={activeTab}>{renderTab()}</main>
      {status !== "connected" && (
        <div style={{ marginTop: 16 }}>
          <ConnectionStatus status={status} />
        </div>
      )}
      {showSettings && (
        <SettingsPanel
          connection={connectedConnection}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
