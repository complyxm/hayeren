import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
