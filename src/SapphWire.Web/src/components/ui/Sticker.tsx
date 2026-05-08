import type { CSSProperties, ReactNode } from "react";

export type StickerColor =
  | "mint"
  | "pink"
  | "lavender"
  | "peach"
  | "butter"
  | "sky"
  | "coral"
  | "paper"
  | "cream";

export const PAL_HEX: Record<StickerColor, string> = {
  mint: "var(--mint)",
  pink: "var(--pink)",
  lavender: "var(--lavender)",
  peach: "var(--peach)",
  butter: "var(--butter)",
  sky: "var(--sky)",
  coral: "var(--coral)",
  paper: "var(--paper)",
  cream: "var(--cream)",
};

export type StickerSize = "sm" | "md" | "lg";

interface StickerProps {
  color?: StickerColor;
  glyph?: ReactNode;
  size?: StickerSize;
  rotate?: number;
  style?: CSSProperties;
}

export function Sticker({
  color = "lavender",
  glyph,
  size = "md",
  rotate = 0,
  style,
}: StickerProps) {
  const cls = `sticker ${size === "sm" ? "sm" : size === "lg" ? "lg" : ""}`;
  return (
    <div
      className={cls}
      style={{
        background: PAL_HEX[color],
        transform: `rotate(${rotate}deg)`,
        ...style,
      }}
    >
      {glyph}
    </div>
  );
}

interface LetterStickerProps {
  name: string;
  color?: StickerColor;
  size?: StickerSize;
}

export function LetterSticker({
  name,
  color = "lavender",
  size = "md",
}: LetterStickerProps) {
  const ch =
    (name || "?").replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase() || "?";
  const fontSize = size === "sm" ? 14 : size === "lg" ? 22 : 16;
  return (
    <Sticker
      color={color}
      size={size}
      glyph={
        <span
          style={{
            fontFamily: "Fredoka",
            fontWeight: 700,
            fontSize,
            color: "var(--ink)",
          }}
        >
          {ch}
        </span>
      }
    />
  );
}

const COLOR_CYCLE: StickerColor[] = [
  "mint",
  "pink",
  "lavender",
  "peach",
  "butter",
  "sky",
  "coral",
];

export function colorFromString(s: string): StickerColor {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return COLOR_CYCLE[Math.abs(hash) % COLOR_CYCLE.length];
}
