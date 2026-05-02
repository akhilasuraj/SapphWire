import type { TabName } from "../App";

const TABS: TabName[] = ["Graph", "Usage", "Things", "Firewall", "Alerts"];

interface Props {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

export default function TopBar({ activeTab, onTabChange }: Props) {
  return (
    <header className="flex items-center border-b border-gray-800 bg-gray-900 px-4">
      <span className="text-lg font-semibold mr-8 py-3">SapphWire</span>
      <nav className="flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              tab === activeTab
                ? "text-gray-100 border-b-2 border-blue-500"
                : "text-gray-400 hover:text-gray-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </header>
  );
}
