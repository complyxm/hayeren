import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // マテナダラン写本を参照した配色（.claude/rules/ui.md）。
      // 朱・ラピスラズリの青・金箔・羊皮紙の4色を軸にし、
      // 汎用的なAI配色（クリーム+テラコッタ等）を避ける。
      colors: {
        parchment: {
          DEFAULT: "#1c1410",
          light: "#2a1f18",
        },
        ink: "#f3e9d8",
        // 塗り・枠線用の彩度の高い原色。写本の顔料そのものの色。
        vermillion: "#8c1c13",
        lapis: "#2d4a72",
        gold: "#c9a227",
        // 文字色用の明るい同色相。濃い羊皮紙の地に原色をそのまま文字に使うと
        // コントラストが 2:1 前後になり読めないため、色相を保ったまま明度だけ上げた
        // （どちらも parchment / parchment-light 上で 5:1 以上）。
        "vermillion-text": "#e0746c",
        "lapis-text": "#7fa0cc",
      },
      fontFamily: {
        // 本文用。西欧文字はNotoの欧文グリフにフォールバックし、
        // 最終的にシステムフォントへ落ちる（アルメニア文字の破綻描画を避ける）。
        sans: [
          '"Noto Sans Armenian"',
          '"Noto Sans"',
          "system-ui",
          "sans-serif",
        ],
        // 見出し用（.claude/rules/ui.md: erkatʻagirの骨格を意識した表示）。
        serif: [
          '"Noto Serif Armenian"',
          '"Noto Serif"',
          "Georgia",
          "serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
