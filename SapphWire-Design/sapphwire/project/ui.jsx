/* Shared cartoon icons + helpers */

const PALETTE = ['mint','pink','lavender','peach','butter','sky','coral'];
const PAL_HEX = {
  mint: 'var(--mint)', pink: 'var(--pink)', lavender: 'var(--lavender)',
  peach: 'var(--peach)', butter: 'var(--butter)', sky: 'var(--sky)', coral: 'var(--coral)',
};

const Ink = ({d, sw=2.2, fill='none', strokeLinecap='round', strokeLinejoin='round'}) => (
  <path d={d} stroke="#2E2A4A" strokeWidth={sw} fill={fill} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin} />
);

/* ========= Tab nav icons ========= */
const TabIcon = {
  Graph: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 18 L8 11 L12 14 L17 6 L21 10" stroke="#2E2A4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="8" cy="11" r="1.5" fill="#2E2A4A"/>
      <circle cx="17" cy="6" r="1.5" fill="#2E2A4A"/>
    </svg>
  ),
  Usage: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="#2E2A4A" strokeWidth="2.5"/>
      <path d="M12 4 A8 8 0 0 1 20 12 L12 12 Z" fill="#FFCDA8" stroke="#2E2A4A" strokeWidth="2.5" strokeLinejoin="round"/>
    </svg>
  ),
  Things: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="12" r="2.4" fill="#B7E8CF" stroke="#2E2A4A" strokeWidth="2"/>
      <circle cx="18" cy="6" r="2.4" fill="#FFC2D1" stroke="#2E2A4A" strokeWidth="2"/>
      <circle cx="18" cy="18" r="2.4" fill="#D6C7FF" stroke="#2E2A4A" strokeWidth="2"/>
      <path d="M8 11 L16 7 M8 13 L16 17" stroke="#2E2A4A" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Firewall: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3 C13 6 16 7 16 11 C16 14 14 16 12 16 C10 16 8 14 8 11 C8 7 11 6 12 3 Z" fill="#FFB3A7" stroke="#2E2A4A" strokeWidth="2.2" strokeLinejoin="round"/>
      <path d="M12 9 C12.5 11 13.5 12 13.5 13" stroke="#2E2A4A" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <rect x="6" y="17" width="12" height="4" rx="1.5" fill="#FFE69A" stroke="#2E2A4A" strokeWidth="2"/>
    </svg>
  ),
  Alerts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3 C8 3 6 6 6 10 C6 13 5 14 4 16 H20 C19 14 18 13 18 10 C18 6 16 3 12 3 Z" fill="#BCDFFB" stroke="#2E2A4A" strokeWidth="2.2" strokeLinejoin="round"/>
      <path d="M10 18 C10 19 11 20 12 20 C13 20 14 19 14 18" stroke="#2E2A4A" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <circle cx="18" cy="5" r="3" fill="#F58FAE" stroke="#2E2A4A" strokeWidth="2"/>
    </svg>
  ),
};

/* ========= Sticker (rounded square w/ glyph) ========= */
function Sticker({ color='lavender', glyph, size='md', rotate=0, style }) {
  const cls = `sticker ${size==='sm'?'sm':size==='lg'?'lg':''}`;
  return (
    <div className={cls} style={{ background: PAL_HEX[color], transform: `rotate(${rotate}deg)`, ...style }}>
      {glyph}
    </div>
  );
}

/* ========= Letter sticker - first 1-2 chars of a name ========= */
function LetterSticker({ name, color, size='md' }) {
  const ch = (name || '?').replace(/[^a-z0-9]/gi,'').slice(0,1).toUpperCase() || '?';
  return (
    <Sticker color={color} size={size} glyph={
      <span style={{
        fontFamily:'Fredoka', fontWeight:700, fontSize: size==='sm'?14: size==='lg'?22:16,
        color:'var(--ink)'
      }}>{ch}</span>
    } />
  );
}

/* ========= Country flag chip (text-based) ========= */
function FlagChip({ code }) {
  const flags = { US:'🇺🇸', IN:'🇮🇳', SG:'🇸🇬', GB:'🇬🇧', DE:'🇩🇪', JP:'🇯🇵', AU:'🇦🇺', VN:'🇻🇳', BR:'🇧🇷', NL:'🇳🇱' };
  return (
    <span className="chip" style={{ background:'var(--cream)', padding:'2px 8px' }}>
      <span style={{ fontSize:13, lineHeight:1 }}>{flags[code]||'🌐'}</span>
      <span className="mono" style={{ fontSize:10 }}>{code}</span>
    </span>
  );
}

/* ========= Tiny SVG sparkline ========= */
function Sparkline({ values, color='peach', width=76, height=18 }) {
  if (!values || values.length===0) return <div className="spark"/>;
  const max = Math.max(...values, 1);
  const w = width, h = height;
  const step = w / (values.length-1);
  const pts = values.map((v,i)=>`${(i*step).toFixed(1)},${(h - (v/max)*h).toFixed(1)}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <div className="spark">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <polygon points={area} fill={PAL_HEX[color]} opacity="0.85" />
        <polyline points={pts} fill="none" stroke="#2E2A4A" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

/* ========= Cartoon button ========= */
function CButton({ children, color='paper', onClick, style }) {
  const bg = color==='paper' ? 'var(--paper)' : PAL_HEX[color];
  return (
    <button className="pill" style={{ background:bg, ...style }} onClick={onClick}>{children}</button>
  );
}

Object.assign(window, { TabIcon, Sticker, LetterSticker, FlagChip, Sparkline, CButton, PAL_HEX, PALETTE, Ink });
