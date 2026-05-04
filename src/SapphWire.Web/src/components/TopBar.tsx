import type { TabName } from "../App";

const TABS: TabName[] = ["Graph", "Usage", "Things", "Firewall", "Alerts"];

interface Props {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  onSettingsClick: () => void;
}

export default function TopBar({
  activeTab,
  onTabChange,
  onSettingsClick,
}: Props) {
  return (
    <header className="flex items-center border-b border-gray-800 bg-gray-900 px-4">
      <span className="text-lg font-semibold mr-8 py-3">SapphWire</span>
      <nav className="flex gap-1 flex-1">
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
      <button
        onClick={onSettingsClick}
        aria-label="Settings"
        className="p-2 text-gray-400 hover:text-gray-100 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    </header>
  );
}
