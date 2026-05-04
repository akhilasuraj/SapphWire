export interface Device {
  mac: string;
  ip: string;
  hostname: string;
  vendor: string;
  deviceType: string;
  friendlyName: string | null;
  pinned: boolean;
  networkId: string;
  firstSeen: string;
  lastSeen: string;
  online: boolean;
  isThisPc: boolean;
  isGateway: boolean;
}

export interface NetworkInfo {
  ssid: string;
  connectionState: string;
  gatewayIp: string;
  dnsServers: string[];
  localIp: string;
  subnetMask: string;
}

export interface ThingsSnapshot {
  devices: Device[];
  networkInfo: NetworkInfo;
  scanning: boolean;
  lastScanTime: string | null;
}

export interface ScanProgress {
  scanning: boolean;
  progress: number;
  lastScanTime: string | null;
}
