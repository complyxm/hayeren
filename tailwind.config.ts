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
        vermillion: "#8c1c13",
        lapis: "#2d4a72",
        gold: "#c9a227",
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
