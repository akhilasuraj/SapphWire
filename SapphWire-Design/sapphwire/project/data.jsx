/* Mock data */

const APPS = [
  { name: 'Claude Code', usage: 4.8e9, color: 'peach', country: 'US' },
  { name: 'Helium', usage: 965e6, color: 'pink', country: 'GB' },
  { name: 'update.exe', usage: 311e6, color: 'butter', country: 'IN' },
  { name: 'Visual Studio Code', usage: 125e6, color: 'sky', country: 'IN' },
  { name: 'infatica_agent.exe', usage: 115e6, color: 'mint', country: 'US' },
  { name: 'Python', usage: 22.2e6, color: 'lavender', country: 'US' },
  { name: 'Microsoft Edge WebView2', usage: 14.9e6, color: 'sky', country: 'US' },
  { name: 'Microsoft OneDrive', usage: 10.8e6, color: 'mint', country: 'US' },
  { name: 'Office SDX Helper', usage: 5.8e6, color: 'butter', country: 'SG' },
  { name: 'Microsoft Teams', usage: 2.7e6, color: 'lavender', country: 'US' },
  { name: 'Background Task Host', usage: 2.5e6, color: 'pink', country: 'US' },
  { name: 'Google Chrome', usage: 2.1e6, color: 'butter', country: 'US' },
  { name: 'IIS Express Worker', usage: 1.6e6, color: 'sky', country: 'AU' },
  { name: 'Wispr Flow', usage: 1.6e6, color: 'mint', country: 'US' },
  { name: 'Microsoft VS 2022', usage: 1.5e6, color: 'lavender', country: 'IN' },
  { name: 'Bitwarden', usage: 562e3, color: 'peach', country: 'US' },
];

const HOSTS = [
  { name: 'api.anthropic.com',           usage: 4.6e9,  country:'US', color:'peach' },
  { name: 'dl.wisprflow.com',            usage: 311e6,  country:'US', color:'pink' },
  { name: 'tropeandtriptych.website',    usage: 287e6,  country:'IN', color:'butter' },
  { name: 'http-intake.logs.us5.dat...', usage: 197e6,  country:'US', color:'sky' },
  { name: 'rr2.sn-un57sn7y.googlevideo', usage: 177e6,  country:'US', color:'mint' },
  { name: 'rr5.sn-npoe7ne6.googlevideo', usage: 132e6,  country:'US', color:'lavender' },
  { name: 'rr5.sn-npoldn7l.googlevideo', usage: 110e6,  country:'US', color:'sky' },
  { name: 'a125.dscr.akamai.net',        usage: 79.4e6, country:'US', color:'mint' },
  { name: 'rr5.sn-npoldnes.googlevideo', usage: 61.2e6, country:'US', color:'butter' },
  { name: 'rr2.sn-npoeenek.googlevideo', usage: 26.5e6, country:'US', color:'pink' },
];

const TRAFFIC_TYPES = [
  { name: 'HTTPS (HTTP over SSL/TLS)', usage: 5.4e9, color:'peach' },
  { name: 'Other',                     usage: 948e6, color:'pink' },
  { name: 'HTTP',                      usage: 15.4e6,color:'butter' },
  { name: 'DNS',                       usage: 1.6e6, color:'sky' },
  { name: 'Multicast DNS (mDNS)',      usage: 558e3, color:'mint' },
  { name: 'HP Virtual Room Service',   usage: 221e3, color:'lavender' },
  { name: 'HTTP Alternate',            usage: 142e3, color:'butter' },
  { name: 'BOOTP',                     usage: 28.4e3,color:'sky' },
];

const DEVICES = [
  { name: 'Living Room Echo',     ip:'192.168.1.42', mac:'AC:5F:3E:01', kind:'Speaker',   color:'mint',     last:'now',     online:true },
  { name: 'Kitchen Hue Hub',      ip:'192.168.1.18', mac:'00:17:88:2A', kind:'Smart Hub', color:'pink',     last:'2m ago',  online:true },
  { name: "Sam's iPhone",         ip:'192.168.1.55', mac:'F0:18:98:CD', kind:'Phone',     color:'lavender', last:'5m ago',  online:true },
  { name: 'Office MacBook',       ip:'192.168.1.10', mac:'A4:83:E7:11', kind:'Laptop',    color:'sky',      last:'now',     online:true },
  { name: 'Roomba J7',            ip:'192.168.1.77', mac:'C8:97:9F:03', kind:'Robot',     color:'butter',   last:'1h ago',  online:false },
  { name: 'Backyard Camera',      ip:'192.168.1.91', mac:'B0:C5:54:DD', kind:'Camera',    color:'peach',    last:'8s ago',  online:true },
  { name: 'Printer (HP LaserJet)',ip:'192.168.1.34', mac:'78:E3:B5:4E', kind:'Printer',   color:'coral',    last:'3h ago',  online:false },
  { name: 'Nintendo Switch',      ip:'192.168.1.61', mac:'04:03:D6:71', kind:'Console',   color:'pink',     last:'2d ago',  online:false },
];

const BLOCKED_APPS = [
  { name:'.NET Host', kind:'.NET' }, { name:'SQL Server VSS Writer - 64 Bit', kind:'system' },
  { name:'Windows Subsystem for Linux', kind:'system' }, { name:'Microsoft Edge Installer', kind:'system' },
  { name:'Windows Modules Installer Worker', kind:'system' }, { name:'vmmemCmZygote', kind:'system' },
  { name:'sh.exe', kind:'shell' }, { name:'JetBrains Debugger Worker', kind:'JB' },
  { name:'Windows Terminal Host', kind:'shell' }, { name:'Free Download Manager', kind:'app' },
  { name:'hostname.exe', kind:'shell' }, { name:'GWldlMon.exe', kind:'system' },
  { name:'Git for Windows', kind:'GIT' }, { name:'Microsoft VC++ Redistributable', kind:'system' },
  { name:'Microsoft Edge', kind:'edge' }, { name:'Postman', kind:'pm' }, { name:'bash.exe', kind:'shell' },
];

const ACTIVE_APPS = [
  { name:'infatica_agent.exe',     host:'162.244.34.4:8888',                                up:552, down:552, color:'mint' },
  { name:'IIS Express Worker',     host:'cdb-ms-prod-australiaeast1-be34...:15033',         up:0,   down:0, color:'sky' },
  { name:'Helium',                 host:'api.popup-blocker.org:443',                        up:3000,down:3000, color:'pink' },
  { name:'Microsoft VS 2022',      host:'e11290.dspg.akamaiedge.net:443',                   up:0,   down:0, color:'lavender' },
  { name:'Microsoft Edge WebView2',host:'partition-cname-trouter-ic3-edf-trouter...:443',   up:0,   down:0, color:'sky' },
  { name:'Host Process for Windows',host:'starlinkrouter.mshome.net:53',                    up:166, down:86, color:'butter' },
  { name:'Microsoft Teams',        host:'partition-cname-trouter-ic3-edf-trouter...:443',   up:0,   down:0, color:'peach' },
  { name:'Claude Code',            host:'mcp-proxy.anthropic.com:443',                      up:20000,down:1000, color:'peach' },
  { name:'Visual Studio Code',     host:'waws-prod-sg1-051.southeastasia.cloudapp.azure.com:443', up:0, down:0, color:'sky' },
  { name:'Python',                 host:'192.168.100.1:9200',                                up:54,  down:386, color:'lavender' },
  { name:'Background Task Host',   host:'e2784.dscd.akamaiedge.net:443',                     up:0,   down:0, color:'pink' },
  { name:'Bitwarden',              host:'dualstack.n.sni.us-eu.fastly.net:443',              up:0,   down:0, color:'peach' },
];

const ALERTS = [
  { date:'Today', items:[
    { app:'Wispr Flow', host:'192.168.1.1', country:'US', time:'3:44 am', color:'mint' },
    { app:'Wispr Flow Helper', host:'o4506267787395072.ingest.sentry.io', country:'US', time:'3:44 am', color:'mint' },
    { app:'Game Bar', host:'settings-prod-cin-1-tagged.centralindia.cloudapp.azure.com', country:'IN', time:'1:14 am', color:'lavender' },
  ]},
  { date:'29 April', items:[
    { app:'OneDriveLauncher', host:'onedscolprdeus02.eastus.cloudapp.azure.com', country:'US', time:'5:09 pm', color:'sky' },
    { app:'Logi Options+ Updater', host:'util.logitech.io', country:'US', time:'5:01 pm', color:'pink' },
    { app:'logioptionsplus_updater.exe', host:'util.logitech.io', country:'US', time:'5:00 pm', color:'butter' },
    { app:'OpenJDK Platform binary', host:'resources.jetbrains.com', country:'US', time:'4:58 pm', color:'peach' },
    { app:'Microsoft OneDriveFileSyncHelper', host:'onedscolprdeus21.centralus.cloudapp.azure.com', country:'US', time:'9:08 am', color:'sky' },
    { app:'Microsoft OneDrive Sync Service', host:'onedscolprdeus11.eastus.cloudapp.azure.com', country:'US', time:'9:08 am', color:'mint' },
    { app:'Updater Service', host:'teams-mrc-ww-perf.tm-4.office.com', country:'US', time:'9:07 am', color:'lavender' },
  ]},
];

/* graph data — pre-baked rolling series */
function genGraphData(seed = 1, points = 60) {
  // Three stacked series (mimic the orange/yellow/pink palette → cartoonized to peach/butter/pink)
  const rand = (s) => {
    let x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  const out = { ts: [], a: [], b: [], c: [] };
  for (let i=0; i<points; i++) {
    const t = i;
    const spike = (i % 8 === 3 || i % 11 === 0) ? rand(seed+i)*0.9 + 0.4 : 0;
    const aBase = 0.15 + Math.abs(Math.sin(i*0.3 + seed))*0.5;
    const bBase = 0.1  + Math.abs(Math.sin(i*0.21 + seed*1.3))*0.4 + spike*0.6;
    const cBase = 0.08 + Math.abs(Math.cos(i*0.18 + seed*0.7))*0.35 + spike*0.4;
    out.ts.push(t);
    out.a.push(aBase);
    out.b.push(bBase);
    out.c.push(cBase);
  }
  return out;
}

function fmtBytes(n) {
  if (n >= 1e9) return (n/1e9).toFixed(1)+' GB';
  if (n >= 1e6) return (n/1e6).toFixed(1)+' MB';
  if (n >= 1e3) return (n/1e3).toFixed(1)+' KB';
  return n + ' B';
}
function fmtRate(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+' MB/s';
  if (n >= 1e3) return (n/1e3).toFixed(1)+' KB/s';
  return n + ' B/s';
}

Object.assign(window, { APPS, HOSTS, TRAFFIC_TYPES, DEVICES, BLOCKED_APPS, ACTIVE_APPS, ALERTS, genGraphData, fmtBytes, fmtRate });
