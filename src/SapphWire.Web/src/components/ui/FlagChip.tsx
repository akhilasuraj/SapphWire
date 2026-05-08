interface FlagChipProps {
  code: string | null;
}

const FLAGS: Record<string, string> = {
  US: "🇺🇸",
  IN: "🇮🇳",
  SG: "🇸🇬",
  GB: "🇬🇧",
  DE: "🇩🇪",
  JP: "🇯🇵",
  AU: "🇦🇺",
  VN: "🇻🇳",
  BR: "🇧🇷",
  NL: "🇳🇱",
  CA: "🇨🇦",
  FR: "🇫🇷",
  IE: "🇮🇪",
  IT: "🇮🇹",
  ES: "🇪🇸",
  CN: "🇨🇳",
  KR: "🇰🇷",
  RU: "🇷🇺",
  UA: "🇺🇦",
  MX: "🇲🇽",
};

export function flagFromCode(code: string): string {
  if (FLAGS[code.toUpperCase()]) return FLAGS[code.toUpperCase()];
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export function FlagChip({ code }: FlagChipProps) {
  if (!code) return null;
  const flag = flagFromCode(code);
  return (
    <span className="chip" style={{ background: "var(--cream)", padding: "2px 8px" }}>
      <span style={{ fontSize: 13, lineHeight: 1 }}>{flag}</span>
      <span className="mono" style={{ fontSize: 10 }}>
        {code.toUpperCase()}
      </span>
    </span>
  );
}
