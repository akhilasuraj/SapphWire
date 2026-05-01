import TopBar from "./components/TopBar";
import ConnectionStatus from "./components/ConnectionStatus";
import { useSignalR } from "./useSignalR";

const HUB_URL = "/hubs/dashboard";

export default function App() {
  const status = useSignalR(HUB_URL);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <TopBar />
      <main className="flex-1 flex items-center justify-center">
        <ConnectionStatus status={status} />
      </main>
    </div>
  );
}
