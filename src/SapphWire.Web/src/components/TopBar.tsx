const TABS = ["Graph", "Usage", "Things", "Firewall", "Alerts"] as const;

export default function TopBar() {
  return (
    <header className="flex items-center border-b border-gray-800 bg-gray-900 px-4">
      <span className="text-lg font-semibold mr-8 py-3">SapphWire</span>
      <nav className="flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            className="px-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-100 transition-colors"
          >
            {tab}
          </button>
        ))}
      </nav>
    </header>
  );
}
