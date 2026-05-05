# SapphWire

A Windows desktop app for monitoring household network activity. SapphWire captures live traffic from Windows ETW, attributes flows to processes, discovers devices on the LAN, and surfaces it all through a local web dashboard. It also integrates with Windows Firewall to block apps and ships as a single self-contained `.exe`.

## Features

- **Graph** — real-time throughput per app/flow with sparklines, filtering, minimap, and timeline alert markers
- **Usage** — historical drill-down by app/period with donut breakdowns
- **Things** — LAN device discovery (ARP / mDNS / SSDP), OUI vendor lookup, friendly naming
- **Firewall** — block/unblock apps via Windows Firewall, with read-only views for non-admins
- **Alerts** — threshold-driven alerts with Windows toast notifications
- **Settings panel** — autostart toggle, toast preference, error banner

## Architecture

| Project | Purpose |
| --- | --- |
| `src/SapphWire.Core` | Domain logic: ETW capture, firewall, persistence (SQLite), alerts, app grouping, device discovery, settings |
| `src/SapphWire.Host` | ASP.NET Core host (SignalR, REST), tray icon, browser launcher, Windows-specific services. Entry point. |
| `src/SapphWire.Web` | React 18 + TypeScript + Vite + Tailwind frontend. Built output is embedded into the host's `wwwroot/`. |
| `tests/SapphWire.Core.Tests` | xUnit + FluentAssertions + NSubstitute |

The host listens on `http://localhost:5148`. Backend → frontend updates flow over SignalR.

## Prerequisites

- Windows 10/11 (x64)
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 22+](https://nodejs.org/) and npm
- An **elevated** terminal — ETW packet capture requires admin privileges

## Run in development

The frontend dev server proxies `/api` and `/hubs` to the backend at `localhost:5148`, so run both side-by-side.

**Terminal 1 — backend (must be elevated):**

```bash
dotnet run --project src/SapphWire.Host
```

**Terminal 2 — frontend:**

```bash
cd src/SapphWire.Web
npm install
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

Set `SAPPHWIRE_LOG_LEVEL=Debug` to enable verbose logs. Logs are written to `%LOCALAPPDATA%\SapphWire\logs\`.

## Build & test

```bash
# Backend
dotnet build SapphWire.sln
dotnet test  SapphWire.sln

# Frontend
cd src/SapphWire.Web
npm run typecheck
npm run test
npm run build      # outputs to src/SapphWire.Web/dist/
```

## Ship as a single executable

`SapphWire.Host.csproj` is already configured for single-file, self-contained `win-x64` publish (`PublishSingleFile`, `SelfContained`, `IncludeNativeLibrariesForSelfExtract`). The frontend's `dist/` directory is auto-embedded into the host's `wwwroot/` at build time via a conditional `<Content>` include.

**Build the frontend first**, then publish:

```bash
# 1. Build the web bundle (creates src/SapphWire.Web/dist/)
cd src/SapphWire.Web
npm install
npm run build
cd ../..

# 2. Publish the host as a single self-contained exe
dotnet publish src/SapphWire.Host -c Release -o out
```

The output is `out/SapphWire.Host.exe` — a standalone executable that does not require .NET to be installed on the target machine. Double-click to run; on first launch it will prompt for elevation (required for ETW).

## Configuration

User settings are persisted to `%LOCALAPPDATA%\SapphWire\settings.json`:

- `autostartEnabled` — registers a Windows Task Scheduler entry so SapphWire starts on logon
- `toastEnabled` — show Windows toast notifications for alerts

Both are exposed through the in-app **Settings** panel.

## License

No license file is currently included.
