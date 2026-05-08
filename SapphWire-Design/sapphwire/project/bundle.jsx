/* ====== Combined: Graph + Usage + Things + Firewall + Alerts + App ====== */

const { useState, useEffect, useMemo, useRef } = React;

/* ---------- Graph tab ---------- */
const TIME_PILLS = ['5 Minutes','3 Hours','24 Hours','Week','Month'];
const FILTER_PILLS = ['All','Apps','Traffic','Publishers'];
const Y_AXIS = ['Auto','100 KB/s','1 MB/s','10 MB/s','100 MB/s'];

function CartoonAreaChart({ data, height=420 }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 1000, h: height });
  useEffect(() => {
    const onResize = () => { if (ref.current) setSize({ w: ref.current.clientWidth, h: height }); };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [height]);
  const { w, h } = size;
  const padL = 56, padR = 16, padT = 16, padB = 56;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const n = data.ts.length;
  const stacks = useMemo(() => {
    const max = data.ts.map((_,i) => data.a[i] + data.b[i] + data.c[i]);
    const peak = Math.max(...max, 1);
    const xs = data.ts.map((_,i) => padL + (i/(n-1))*innerW);
    const yA = data.a.map(v => padT + innerH - (v/peak)*innerH);
    const yAB = data.a.map((v,i) => padT + innerH - ((v + data.b[i])/peak)*innerH);
    const yABC = data.a.map((v,i) => padT + innerH - ((v + data.b[i] + data.c[i])/peak)*innerH);
    return { xs, yA, yAB, yABC, peak };
  }, [data, w, h]);
  const baseY = padT + innerH;
  const path = (ysTop, ysBot) => {
    const top = stacks.xs.map((x,i)=>`${i===0?'M':'L'} ${x.toFixed(1)} ${ysTop[i].toFixed(1)}`).join(' ');
    const bot = stacks.xs.slice().reverse().map((x,i)=>{
      const idx = stacks.xs.length-1-i;
      const y = ysBot ? ysBot[idx] : baseY;
      return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    return `${top} ${bot} Z`;
  };
  const ticks = [0,0.25,0.5,0.75,1].map(t => ({ v: t*stacks.peak, y: padT + innerH - t*innerH }));
  const alertIdx = [Math.floor(n*0.25), Math.floor(n*0.6), Math.floor(n*0.85)];
  return (
    <div ref={ref} style={{ width:'100%', position:'relative' }}>
      <svg width={w} height={h} style={{ display:'block' }}>
        <defs>
          <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#2E2A4A" opacity="0.07"/>
          </pattern>
        </defs>
        <rect x={padL} y={padT} width={innerW} height={innerH} fill="url(#dot-grid)" rx="14"/>
        {ticks.map((t,i) => (
          <g key={i}>
            <line x1={padL} y1={t.y} x2={padL+innerW} y2={t.y} stroke="#2E2A4A" strokeWidth="1" strokeDasharray="3 5" opacity="0.18"/>
            <text x={padL-10} y={t.y+4} textAnchor="end" fontSize="11" fontFamily="JetBrains Mono" fill="#4A4670">{fmtRate(t.v*1e6)}</text>
          </g>
        ))}
        <path d={path(stacks.yABC, stacks.yAB)} fill="#FFC2D1" stroke="#2E2A4A" strokeWidth="2" strokeLinejoin="round"/>
        <path d={path(stacks.yAB, stacks.yA)} fill="#FFE69A" stroke="#2E2A4A" strokeWidth="2" strokeLinejoin="round"/>
        <path d={path(stacks.yA, null)} fill="#FFCDA8" stroke="#2E2A4A" strokeWidth="2.2" strokeLinejoin="round"/>
        {alertIdx.map((i,k) => (
          <g key={k}>
            <line x1={stacks.xs[i]} y1={padT} x2={stacks.xs[i]} y2={padT+innerH} stroke="#F07A66" strokeWidth="2" strokeDasharray="4 4"/>
            <g transform={`translate(${stacks.xs[i]} ${padT+innerH+12})`}>
              <circle r="7" fill="#FFB3A7" stroke="#2E2A4A" strokeWidth="2"/>
              <text y="3.5" textAnchor="middle" fontSize="9" fontFamily="Fredoka" fontWeight="700" fill="#2E2A4A">!</text>
            </g>
          </g>
        ))}
        {[0,0.25,0.5,0.75,1].map((t,i) => {
          const x = padL + t*innerW;
          const idx = Math.floor(t*(n-1));
          const sec = (data.ts[idx] * 4) % 60;
          return <text key={i} x={x} y={padT+innerH+34} textAnchor="middle" fontSize="11" fontFamily="JetBrains Mono" fill="#4A4670">12:20:{sec.toString().padStart(2,'0')}</text>;
        })}
        <rect x={padL} y={padT} width={innerW} height={innerH} fill="none" stroke="#2E2A4A" strokeWidth="2" rx="14"/>
      </svg>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="chip" style={{ background: PAL_HEX[color] }}>
      <span style={{ width:10, height:10, background: PAL_HEX[color], borderRadius:3, border:'2px solid var(--ink)' }} />
      {label}
    </span>
  );
}
function StatCard({ color, label, value, sub }) {
  return (
    <div className="card-tight" style={{ background: PAL_HEX[color] }}>
      <div className="row-sub" style={{ marginBottom:6, color:'var(--ink-soft)' }}>{label}</div>
      <div style={{ fontFamily:'Fredoka', fontSize:22, fontWeight:600 }}>{value}</div>
      <div className="row-sub mono" style={{ marginTop:6 }}>{sub}</div>
    </div>
  );
}

function GraphTab() {
  const [time, setTime] = useState('5 Minutes');
  const [filter, setFilter] = useState('All');
  const [yScale, setYScale] = useState('Auto');
  const [tick, setTick] = useState(0);
  const data = useMemo(() => genGraphData(1 + tick*0.05), [tick]);
  useEffect(() => { const id = setInterval(() => setTick(t => t+1), 1500); return () => clearInterval(id); }, []);
  const latest = data.a[data.a.length-1] + data.b[data.b.length-1] + data.c[data.c.length-1];
  const total = (latest * 1e6).toFixed(0);
  return (
    <div className="page-fade">
      <div className="section-head">
        <h1 className="section-title">Live Throughput</h1>
        <span className="sticker-tag">Live</span>
        <div style={{ flex:1 }} />
        <div className="cart-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="#2E2A4A" strokeWidth="2.5"/><path d="m20 20-4-4" stroke="#2E2A4A" strokeWidth="2.5" strokeLinecap="round"/></svg>
          <input placeholder="Find an app or host…" />
        </div>
      </div>
      <div className="card" style={{ marginBottom:18 }}>
        <div className="flex between center" style={{ flexWrap:'wrap', gap:12, marginBottom:14 }}>
          <div className="pill-row">
            {FILTER_PILLS.map(p => (
              <button key={p} className={`pill ${p===filter?'active':''}`} style={p===filter ? {'--p-active':'var(--lavender)'} : {}} onClick={()=>setFilter(p)}>{p}</button>
            ))}
          </div>
          <div className="flex gap-12 center" style={{ flexWrap:'wrap' }}>
            <select className="cart-select" value={yScale} onChange={e=>setYScale(e.target.value)}>{Y_AXIS.map(y => <option key={y}>{y}</option>)}</select>
            <div className="pill-row">
              {TIME_PILLS.map(p => (
                <button key={p} className={`pill ${p===time?'active':''}`} style={p===time ? {'--p-active':'var(--peach)'} : {}} onClick={()=>setTime(p)}>{p}</button>
              ))}
            </div>
          </div>
        </div>
        <CartoonAreaChart data={data} />
        <div className="flex between center" style={{ marginTop:14, paddingTop:12, borderTop:'2.5px dashed var(--ink-mute)' }}>
          <div className="flex gap-12 center" style={{ flexWrap:'wrap' }}>
            <Legend color="peach" label="Apps" /><Legend color="butter" label="Traffic" /><Legend color="pink" label="Publishers" />
            <span className="chip" style={{ background:'var(--coral)' }}>
              <span style={{ width:8, height:8, background:'var(--coral-deep)', borderRadius:'50%', border:'2px solid var(--ink)' }} />Alert
            </span>
          </div>
          <div className="flex gap-8 center">
            <span className="row-sub">Now</span>
            <span className="chip mono" style={{ background:'var(--mint)', fontSize:13, padding:'4px 12px' }}>{fmtRate(parseInt(total))}</span>
          </div>
        </div>
      </div>
      <div className="grid-3">
        <StatCard color="peach" label="Top App" value="Claude Code" sub="20.0 KB/s out · 1.0 KB/s in" />
        <StatCard color="butter" label="Top Host" value="api.anthropic.com" sub="4.6 GB today" />
        <StatCard color="pink" label="Active Flows" value="42" sub="across 16 apps" />
      </div>
    </div>
  );
}

/* ---------- Usage tab ---------- */
function CartoonDonut({ total, lan, wan, size=180 }) {
  const r = size/2 - 16, cx = size/2, cy = size/2;
  const total2 = lan + wan || 1, lanFrac = lan / total2;
  const C = 2 * Math.PI * r, lanLen = C * lanFrac, wanLen = C - lanLen;
  return (
    <div style={{ position:'relative', width:size, height:size, margin:'0 auto' }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="var(--paper)" stroke="#2E2A4A" strokeWidth="2.5"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--peach)" strokeWidth="22" strokeDasharray={`${wanLen} ${C}`} transform={`rotate(-90 ${cx} ${cy})`}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--butter)" strokeWidth="22" strokeDasharray={`${lanLen} ${C}`} strokeDashoffset={-wanLen} transform={`rotate(-90 ${cx} ${cy})`}/>
        <circle cx={cx} cy={cy} r={r+11} fill="none" stroke="#2E2A4A" strokeWidth="2"/>
        <circle cx={cx} cy={cy} r={r-11} fill="none" stroke="#2E2A4A" strokeWidth="2"/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', textAlign:'center' }}>
        <div><div className="row-sub">Total</div><div style={{ fontFamily:'Fredoka', fontWeight:600, fontSize:24 }}>{fmtBytes(total)}</div></div>
      </div>
    </div>
  );
}
function UsageRow({ item, max, kind='app' }) {
  const flag = item.country ? <FlagChip code={item.country}/> : null;
  return (
    <div className="row" style={{ padding:'8px 12px' }}>
      {kind==='host' ? <Sticker color={item.color} size="sm" glyph={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#2E2A4A" strokeWidth="2.2"/><path d="M4 12h16 M12 4 C9 7 9 17 12 20 M12 4 C15 7 15 17 12 20" stroke="#2E2A4A" strokeWidth="1.8" fill="none"/></svg>
      }/> : kind==='traffic' ? <Sticker color={item.color} size="sm" glyph={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="3" stroke="#2E2A4A" strokeWidth="2.2" fill="none"/><path d="M7 10 L12 14 L17 10" stroke="#2E2A4A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      }/> : <LetterSticker name={item.name} color={item.color} size="sm" />}
      <div style={{ flex:1, minWidth:0 }}>
        <div className="row-name" style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontSize:13 }}>{item.name}</div>
        <div className="bar-track" style={{ '--bar': PAL_HEX[item.color], marginTop:5, height:7 }}>
          <div className="bar-fill" style={{ width: `${Math.min(100, (item.usage/max)*100)}%` }}/>
        </div>
      </div>
      <div className="mono" style={{ fontSize:11, color:'var(--ink-soft)', minWidth:60, textAlign:'right' }}>{fmtBytes(item.usage)}</div>
      {flag}
    </div>
  );
}
function UsageTab() {
  const [filter, setFilter] = useState('All');
  const [scope, setScope] = useState('Day');
  const total=6.4e9, lan=24.2e6, wan=6.3e9;
  const maxApp=APPS[0].usage, maxHost=HOSTS[0].usage, maxTraffic=TRAFFIC_TYPES[0].usage;
  return (
    <div className="page-fade">
      <div className="section-head">
        <h1 className="section-title">Usage</h1>
        <span className="sticker-tag" style={{ background:'var(--peach)' }}>May 1</span>
        <div style={{ flex:1 }} />
        <div className="pill-row">{['All','Apps','Traffic','Publishers'].map(p => (
          <button key={p} className={`pill ${p===filter?'active':''}`} style={p===filter ? {'--p-active':'var(--mint)'} : {}} onClick={()=>setFilter(p)}>{p}</button>
        ))}</div>
        <select className="cart-select" value={scope} onChange={e=>setScope(e.target.value)}><option>Day</option><option>Week</option><option>Month</option></select>
      </div>
      <div className="grid-usage">
        <div className="card">
          <div className="card-title"><span className="dot" style={{background:'var(--peach)'}}/>Total Bandwidth</div>
          <CartoonDonut total={total} lan={lan} wan={wan} />
          <div className="flex between" style={{ marginTop:14 }}>
            <div style={{ textAlign:'center', flex:1 }}><div className="chip" style={{ background:'var(--butter)' }}>↓ LAN</div><div className="mono" style={{ fontSize:18, marginTop:6, fontWeight:700 }}>{fmtBytes(lan)}</div></div>
            <div style={{ textAlign:'center', flex:1 }}><div className="chip" style={{ background:'var(--peach)' }}>↑ WAN</div><div className="mono" style={{ fontSize:18, marginTop:6, fontWeight:700 }}>{fmtBytes(wan)}</div></div>
          </div>
          <div className="doodle-line" />
          <div className="row-sub">Sorted by usage. <a style={{ color:'var(--lavender-deep)', fontWeight:800 }}>Add alert +</a></div>
        </div>
        <div className="card"><div className="card-title"><span className="dot" style={{background:'var(--mint)'}}/>Apps</div>
          <div className="scrollbox" style={{ maxHeight:560 }}>{APPS.slice(0,16).map((a,i) => <UsageRow key={i} item={a} max={maxApp} kind="app" />)}</div></div>
        <div className="card"><div className="card-title"><span className="dot" style={{background:'var(--lavender)'}}/>Hosts</div>
          <div className="scrollbox" style={{ maxHeight:560 }}>{HOSTS.map((h,i) => <UsageRow key={i} item={h} max={maxHost} kind="host" />)}</div></div>
        <div className="card"><div className="card-title"><span className="dot" style={{background:'var(--pink)'}}/>Traffic Type</div>
          <div className="scrollbox" style={{ maxHeight:560 }}>{TRAFFIC_TYPES.map((t,i) => <UsageRow key={i} item={t} max={maxTraffic} kind="traffic" />)}</div></div>
      </div>
    </div>
  );
}

/* ---------- Things tab ---------- */
const KIND_ICON = {
  Speaker: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="6" y="3" width="12" height="18" rx="3" stroke="#2E2A4A" strokeWidth="2.2" fill="none"/><circle cx="12" cy="14" r="3" stroke="#2E2A4A" strokeWidth="2" fill="none"/><circle cx="12" cy="7" r="1.2" fill="#2E2A4A"/></svg>,
  'Smart Hub': <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill="#2E2A4A"/><circle cx="12" cy="12" r="6" stroke="#2E2A4A" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="9" stroke="#2E2A4A" strokeWidth="1.8" fill="none" strokeDasharray="3 3"/></svg>,
  Phone: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="7" y="2" width="10" height="20" rx="2.5" stroke="#2E2A4A" strokeWidth="2.2" fill="none"/><circle cx="12" cy="18.5" r="1" fill="#2E2A4A"/></svg>,
  Laptop: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="11" rx="2" stroke="#2E2A4A" strokeWidth="2.2" fill="none"/><path d="M2 19 H22" stroke="#2E2A4A" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  Robot: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="7" stroke="#2E2A4A" strokeWidth="2.2" fill="none"/><circle cx="12" cy="13" r="3" stroke="#2E2A4A" strokeWidth="2" fill="none"/><circle cx="12" cy="13" r="1" fill="#2E2A4A"/></svg>,
  Camera: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="12" rx="2.5" stroke="#2E2A4A" strokeWidth="2.2" fill="none"/><circle cx="12" cy="13" r="3.5" stroke="#2E2A4A" strokeWidth="2" fill="none"/><path d="M9 7 V5 H15 V7" stroke="#2E2A4A" strokeWidth="2.2" fill="none"/></svg>,
  Printer: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="6" y="3" width="12" height="6" stroke="#2E2A4A" strokeWidth="2.2" fill="none"/><rect x="3" y="9" width="18" height="9" rx="1.5" stroke="#2E2A4A" strokeWidth="2.2" fill="none"/><rect x="7" y="14" width="10" height="6" stroke="#2E2A4A" strokeWidth="2.2" fill="none"/></svg>,
  Console: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="8" width="20" height="9" rx="3" stroke="#2E2A4A" strokeWidth="2.2" fill="none"/><circle cx="16" cy="12.5" r="1.2" fill="#2E2A4A"/><path d="M6 10 V15 M4 12.5 H8" stroke="#2E2A4A" strokeWidth="2" strokeLinecap="round"/></svg>,
};
function DeviceCard({ d }) {
  return (
    <div className="card-tight" style={{ background:'var(--paper)', position:'relative' }}>
      {d.online && (<span style={{ position:'absolute', top:14, right:14, width:12, height:12, borderRadius:'50%', background:'var(--mint-deep)', border:'2.5px solid var(--ink)', boxShadow:'0 0 0 4px rgba(111,203,160,0.3)' }} />)}
      <div className="flex gap-12 center" style={{ marginBottom:10 }}>
        <Sticker color={d.color} size="lg" glyph={KIND_ICON[d.kind] || KIND_ICON.Laptop} rotate={-3}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'Fredoka', fontWeight:600, fontSize:17 }}>{d.name}</div>
          <div className="row-sub">{d.kind} · {d.online ? 'connected' : 'offline'}</div>
        </div>
      </div>
      <div className="flex gap-8" style={{ flexWrap:'wrap' }}>
        <span className="chip mono" style={{ background:'var(--cream)' }}>IP {d.ip}</span>
        <span className="chip mono" style={{ background:'var(--cream)' }}>{d.mac}</span>
      </div>
      <div className="doodle-line" style={{ margin:'10px 0' }}/>
      <div className="flex between center">
        <span className="row-sub">Last seen <b>{d.last}</b></span>
        <button className="pill" style={{ background:'var(--lavender)', fontSize:11, padding:'5px 12px' }}>Inspect →</button>
      </div>
    </div>
  );
}
function ThingsTab() {
  const [view, setView] = useState('Active');
  const list = view==='Active' ? DEVICES.filter(d=>d.online) : DEVICES;
  return (
    <div className="page-fade">
      <div className="section-head">
        <h1 className="section-title">Things on Your Network</h1>
        <span className="sticker-tag" style={{ background:'var(--mint)' }}>Falcon Boost · Connected</span>
        <div style={{ flex:1 }} />
        <div className="pill-row">
          <button className={`pill ${view==='Active'?'active':''}`} style={view==='Active'?{'--p-active':'var(--pink)'}:{}} onClick={()=>setView('Active')}>Active <span className="badge mono" style={{ background:'var(--ink)', color:'var(--paper)', fontSize:10, padding:'1px 6px', borderRadius:'8px', marginLeft:6 }}>{DEVICES.filter(d=>d.online).length}</span></button>
          <button className={`pill ${view==='All'?'active':''}`} style={view==='All'?{'--p-active':'var(--pink)'}:{}} onClick={()=>setView('All')}>All <span className="badge mono" style={{ background:'var(--ink)', color:'var(--paper)', fontSize:10, padding:'1px 6px', borderRadius:'8px', marginLeft:6 }}>58</span></button>
        </div>
        <button className="pill" style={{ background:'var(--butter)' }}><span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 4 V20 M4 12 H20" stroke="#2E2A4A" strokeWidth="2.6" strokeLinecap="round"/></svg>Scan</span></button>
      </div>
      <div className="card" style={{ marginBottom:18 }}>
        <div className="flex between center" style={{ flexWrap:'wrap', gap:12 }}>
          <div className="flex gap-12 center">
            <Sticker color="sky" size="lg" rotate={-4} glyph={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M2 9 C7 4 17 4 22 9" stroke="#2E2A4A" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
                <path d="M5 13 C8 10 16 10 19 13" stroke="#2E2A4A" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
                <path d="M8 17 C10 15 14 15 16 17" stroke="#2E2A4A" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
                <circle cx="12" cy="20" r="1.6" fill="#2E2A4A"/>
              </svg>
            }/>
            <div>
              <div style={{ fontFamily:'Fredoka', fontSize:22, fontWeight:600 }}>Falcon Boost</div>
              <div className="row-sub">2.4 + 5 GHz · WPA3 · {DEVICES.filter(d=>d.online).length} devices online</div>
            </div>
          </div>
          <div className="flex gap-8">
            <span className="chip" style={{ background:'var(--mint)' }}>↓ 482 Mbps</span>
            <span className="chip" style={{ background:'var(--peach)' }}>↑ 92 Mbps</span>
            <span className="chip" style={{ background:'var(--butter)' }}>Ping 14ms</span>
          </div>
        </div>
      </div>
      <div className="grid-3">{list.map((d,i) => <DeviceCard key={i} d={d} />)}</div>
    </div>
  );
}

/* ---------- Firewall tab ---------- */
function MiniRibbon() {
  const w=1200, h=110, n=60;
  const yA=[], yB=[];
  for (let i=0; i<n; i++) {
    yA.push(20 + Math.abs(Math.sin(i*0.3))*30 + ((i%7===2)?25:0));
    yB.push(25 + Math.abs(Math.cos(i*0.22))*22);
  }
  const path = (ys) => {
    let p = `M 0 ${h}`;
    ys.forEach((y,i) => p += ` L ${(i*(w/(n-1))).toFixed(1)} ${(h - y).toFixed(1)}`);
    return p + ` L ${w} ${h} Z`;
  };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width:'100%', height:110, display:'block' }}>
      <path d={path(yA)} fill="var(--peach)" stroke="#2E2A4A" strokeWidth="2"/>
      <path d={path(yB)} fill="var(--butter)" stroke="#2E2A4A" strokeWidth="2" opacity="0.95"/>
    </svg>
  );
}
function BlockedRow({ b, blocked, onToggle }) {
  return (
    <div className="row" style={{ padding:'8px 12px' }}>
      <Sticker color={blocked?'coral':'mint'} size="sm" glyph={
        blocked ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#2E2A4A" strokeWidth="2.2" fill="none"/><path d="M6 6 L18 18" stroke="#2E2A4A" strokeWidth="2.5" strokeLinecap="round"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12 L10 17 L19 7" stroke="#2E2A4A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      }/>
      <LetterSticker name={b.name} color={b.kind==='JB'?'lavender':b.kind==='edge'?'sky':b.kind==='pm'?'peach':'butter'} size="sm" />
      <div style={{ flex:1, minWidth:0 }}><div className="row-name" style={{ fontSize:13 }}>{b.name}</div></div>
      <button className="pill" style={{ background: blocked?'var(--coral)':'var(--mint)', fontSize:11, padding:'4px 12px' }} onClick={onToggle}>{blocked?'Blocked':'Allowed'}</button>
    </div>
  );
}
function FirewallTab() {
  const [enabled, setEnabled] = useState(false);
  const [profile, setProfile] = useState('Home');
  const [blocked, setBlocked] = useState(() => { const s={}; BLOCKED_APPS.forEach((b,i)=> s[b.name]=i<7); return s; });
  const blockedCount = Object.values(blocked).filter(Boolean).length;
  return (
    <div className="page-fade">
      <div className="section-head">
        <h1 className="section-title">Firewall</h1>
        <span className="sticker-tag" style={{ background: enabled?'var(--mint)':'var(--coral)' }}>{enabled?'Shielding':'Off duty'}</span>
        <div style={{ flex:1 }} />
        <select className="cart-select" value={profile} onChange={e=>setProfile(e.target.value)}><option>Home</option><option>Work</option><option>Cafe</option><option>Travel</option></select>
        <button className="pill" style={{ background:'var(--lavender)' }}>Profile ▾</button>
      </div>
      <div className="card" style={{ marginBottom:18, padding:0, overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', background: enabled?'linear-gradient(120deg, var(--mint) 0%, var(--sky) 100%)':'linear-gradient(120deg, var(--cream-2) 0%, var(--peach) 100%)', borderBottom:'2.5px solid var(--ink)' }}>
          <div className="flex between center" style={{ flexWrap:'wrap', gap:12 }}>
            <div className="flex gap-16 center">
              <Sticker color={enabled?'mint':'coral'} size="lg" rotate={-4} glyph={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3 L20 6 V12 C20 16 16 19 12 21 C8 19 4 16 4 12 V6 Z" stroke="#2E2A4A" strokeWidth="2.4" fill="var(--paper)" strokeLinejoin="round"/>
                  {enabled && <path d="M9 12 L11 14 L15 10" stroke="#2E2A4A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>}
                </svg>
              }/>
              <div>
                <div style={{ fontFamily:'Fredoka', fontSize:24, fontWeight:600, marginBottom:4 }}>Firewall is {enabled?'on':'off'}</div>
                <div className="row-sub">{enabled?`${blockedCount} apps blocked · ${BLOCKED_APPS.length-blockedCount} allowed`:'Click the toggle to start shielding your network.'}</div>
              </div>
            </div>
            <div className="flex gap-12 center">
              <span style={{ fontFamily:'Fredoka', fontWeight:600, fontSize:14 }}>{enabled?'ON':'OFF'}</span>
              <div className={`toggle ${enabled?'on':''}`} onClick={()=>setEnabled(!enabled)}><div className="knob"/></div>
            </div>
          </div>
        </div>
        <MiniRibbon/>
        <div className="flex between" style={{ padding:'10px 18px', borderTop:'2.5px dashed var(--ink-mute)' }}>
          <span className="chip" style={{ background:'var(--peach)' }}>Apps</span>
          <span className="chip" style={{ background:'var(--butter)' }}>Hosts</span>
          <span className="chip" style={{ background:'var(--pink)' }}>VirusTotal</span>
          <span className="chip mono" style={{ background:'var(--cream)' }}>200 MB / day</span>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title"><span className="dot" style={{background:'var(--coral)'}}/>Blocked Apps · {blockedCount}</div>
          <div className="cart-search" style={{ width:'100%', marginBottom:12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="#2E2A4A" strokeWidth="2.5"/><path d="m20 20-4-4" stroke="#2E2A4A" strokeWidth="2.5" strokeLinecap="round"/></svg>
            <input placeholder="Search blocked apps…" />
          </div>
          <div className="scrollbox" style={{ maxHeight:520 }}>{BLOCKED_APPS.filter((_,i)=>blocked[BLOCKED_APPS[i].name]).map((b,i) => (<BlockedRow key={i} b={b} blocked={true} onToggle={()=>setBlocked({...blocked,[b.name]:false})}/>))}</div>
        </div>
        <div className="card">
          <div className="card-title"><span className="dot" style={{background:'var(--mint)'}}/>Allowed Apps</div>
          <div className="cart-search" style={{ width:'100%', marginBottom:12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="#2E2A4A" strokeWidth="2.5"/><path d="m20 20-4-4" stroke="#2E2A4A" strokeWidth="2.5" strokeLinecap="round"/></svg>
            <input placeholder="Search allowed apps…" />
          </div>
          <div className="scrollbox" style={{ maxHeight:520 }}>{BLOCKED_APPS.filter((_,i)=>!blocked[BLOCKED_APPS[i].name]).map((b,i) => (<BlockedRow key={i} b={b} blocked={false} onToggle={()=>setBlocked({...blocked,[b.name]:true})}/>))}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Alerts tab ---------- */
function AlertCard({ a }) {
  return (
    <div className="row" style={{ padding:'12px 14px' }}>
      <div style={{ position:'relative' }}>
        <Sticker color={a.color} size="md" glyph={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#2E2A4A" strokeWidth="2.2" fill="none"/><path d="M12 7 V13" stroke="#2E2A4A" strokeWidth="2.4" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1.2" fill="#2E2A4A"/></svg>
        }/>
        <span className="sticker-tag" style={{ position:'absolute', top:-8, left:-10, background:'var(--mint-deep)', fontSize:8, padding:'2px 6px', transform:'rotate(-10deg)' }}>NEW</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13 }}>
          <b style={{ fontWeight:800 }}>{a.app}</b>
          <span style={{ color:'var(--ink-soft)' }}> initiated its first network connection to </span>
          <span className="mono" style={{ background:'var(--cream)', padding:'1px 8px', borderRadius:6, border:'2px solid var(--ink)', fontSize:11 }}>{a.host}</span>
        </div>
      </div>
      <FlagChip code={a.country}/>
      <div style={{ textAlign:'right', minWidth:120 }}>
        <div className="row-sub" style={{ fontSize:11 }}>First seen</div>
        <div className="mono" style={{ fontSize:12, fontWeight:800 }}>{a.time}</div>
      </div>
    </div>
  );
}
function AlertsTab() {
  const [view, setView] = useState('Important');
  const [sort, setSort] = useState('Date');
  const totalCount = ALERTS.reduce((s,g)=>s+g.items.length,0);
  return (
    <div className="page-fade">
      <div className="section-head">
        <h1 className="section-title">Alerts</h1>
        <span className="sticker-tag" style={{ background:'var(--pink)' }}>{totalCount} new today</span>
        <div style={{ flex:1 }} />
        <div className="pill-row">{['Important','Logs','All'].map(v => (
          <button key={v} className={`pill ${view===v?'active':''}`} style={view===v?{'--p-active':'var(--sky)'}:{}} onClick={()=>setView(v)}>{v}</button>
        ))}</div>
        <select className="cart-select" value={sort} onChange={e=>setSort(e.target.value)}><option>Date</option><option>App</option><option>Host</option></select>
      </div>
      <div className="card" style={{ marginBottom:18, padding:'14px 18px' }}>
        <div className="flex between center" style={{ flexWrap:'wrap', gap:14 }}>
          <div className="flex gap-12 center">
            <Sticker color="butter" size="lg" rotate={-3} glyph={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M12 3 L21 19 H3 Z" stroke="#2E2A4A" strokeWidth="2.4" fill="var(--coral)" strokeLinejoin="round"/>
                <path d="M12 9 V14" stroke="#2E2A4A" strokeWidth="2.2" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1" fill="#2E2A4A"/>
              </svg>
            }/>
            <div>
              <div style={{ fontFamily:'Fredoka', fontSize:20, fontWeight:600 }}>Stay watchful</div>
              <div className="row-sub">{totalCount} first-time connections in the last 24 hours · 0 marked malicious</div>
            </div>
          </div>
          <div className="flex gap-8">
            <span className="chip" style={{ background:'var(--mint)' }}>3 Today</span>
            <span className="chip" style={{ background:'var(--lavender)' }}>7 Yesterday</span>
            <button className="pill" style={{ background:'var(--peach)' }}>Mark all read</button>
          </div>
        </div>
      </div>
      {ALERTS.map((group,gi) => (
        <div key={gi} style={{ marginBottom:24 }}>
          <div className="flex gap-12 center" style={{ marginBottom:12 }}>
            <span className="sticker-tag" style={{ background: gi===0?'var(--mint)':'var(--lavender)', transform:'rotate(-2deg)', fontSize:12 }}>{group.date}</span>
            <div style={{ flex:1, height:0, borderTop:'2.5px dashed var(--ink-mute)' }}/>
            <span className="row-sub mono">{group.items.length} events</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{group.items.map((a,i) => <AlertCard key={i} a={a}/>)}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- App shell ---------- */
const TABS = ['Graph','Usage','Things','Firewall','Alerts'];
const TAB_COLORS = { Graph:'sky', Usage:'peach', Things:'mint', Firewall:'pink', Alerts:'lavender' };
function TopBar({ tab, setTab }) {
  return (
    <header className="topbar" data-screen-label="00 TopBar">
      <div className="brand">
        <div className="brand-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 3 L19 8 L19 16 L12 21 L5 16 L5 8 Z" stroke="#2E2A4A" strokeWidth="2.4" fill="var(--paper)" strokeLinejoin="round"/>
            <path d="M9 11 L12 9 L15 11 L15 14 L12 16 L9 14 Z" stroke="#2E2A4A" strokeWidth="2" fill="var(--pink)" strokeLinejoin="round"/>
          </svg>
        </div>
        SapphWire
      </div>
      <nav className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab-btn ${t===tab?'active':''}`} style={t===tab ? {'--accent': PAL_HEX[TAB_COLORS[t]]} : {}} onClick={()=>setTab(t)}>
            {TabIcon[t]} <span>{t}</span>
            {t==='Things' && <span className="badge">5</span>}
            {t==='Alerts' && <span className="badge">3</span>}
          </button>
        ))}
      </nav>
      <span className="upgrade-pill">⭐ UPGRADE</span>
      <button className="icon-btn" title="Settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="#2E2A4A" strokeWidth="2.2"/>
          <path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M4.9 19.1 L7 17 M17 7 L19.1 4.9" stroke="#2E2A4A" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </button>
    </header>
  );
}
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "background": "cream",
  "shadows": "hard"
}/*EDITMODE-END*/;
function App() {
  const [tab, setTab] = useState('Graph');
  const [tw, setTweak] = window.useTweaks ? useTweaks(TWEAK_DEFAULTS) : [TWEAK_DEFAULTS, ()=>{}];
  useEffect(() => {
    const map = { cream:'#FDF5E6', blush:'#FBE9EC', mint:'#E8F6EE', lavender:'#EFEAFB', paper:'#FFFCF5' };
    document.body.style.background = map[tw.background] || '#FDF5E6';
    if (tw.shadows==='soft') {
      document.documentElement.style.setProperty('--shadow', '0 4px 0 rgba(46,42,74,0.45)');
      document.documentElement.style.setProperty('--shadow-sm','0 2px 0 rgba(46,42,74,0.45)');
      document.documentElement.style.setProperty('--shadow-lg','0 6px 0 rgba(46,42,74,0.45)');
    } else if (tw.shadows==='none') {
      document.documentElement.style.setProperty('--shadow','none');
      document.documentElement.style.setProperty('--shadow-sm','none');
      document.documentElement.style.setProperty('--shadow-lg','none');
    } else {
      document.documentElement.style.setProperty('--shadow', '4px 4px 0 var(--ink)');
      document.documentElement.style.setProperty('--shadow-sm','2px 2px 0 var(--ink)');
      document.documentElement.style.setProperty('--shadow-lg','6px 6px 0 var(--ink)');
    }
  }, [tw.background, tw.shadows]);
  const renderTab = () => ({Graph:<GraphTab/>,Usage:<UsageTab/>,Things:<ThingsTab/>,Firewall:<FirewallTab/>,Alerts:<AlertsTab/>}[tab]);
  return (
    <div className="app" data-screen-label={`SapphWire ${tab}`}>
      <TopBar tab={tab} setTab={setTab} />
      <main key={tab}>{renderTab()}</main>
      {window.TweaksPanel && (
        <TweaksPanel title="Tweaks">
          <TweakSection title="Theme">
            <TweakRadio label="Shadows" value={tw.shadows} options={[{value:'hard',label:'Hard'},{value:'soft',label:'Soft'},{value:'none',label:'None'}]} onChange={v => setTweak('shadows', v)} />
            <TweakSelect label="Background" value={tw.background} options={[{value:'cream',label:'Cream'},{value:'blush',label:'Blush'},{value:'mint',label:'Mint'},{value:'lavender',label:'Lavender'},{value:'paper',label:'Paper white'}]} onChange={v => setTweak('background', v)} />
          </TweakSection>
        </TweaksPanel>
      )}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
