import { Fragment, type ReactNode } from "react";

/**
 * 文法課の explanation_ja は Markdown（見出し・箇条書き・表・太字）で書かれている。
 * 依存を増やさず（CLAUDE.md §4）、この用途に必要な最小限だけを描画する部品。
 * 対応: `### 見出し` / `- 箇条書き` / `| a | b |` 表 / `**太字**` / 空行 / それ以外は段落。
 * アルメニア文字は lang="hy" を付けたいが行内強調の粒度では付けきれないため、
 * ルート要素に lang を付けず、呼び出し側で必要に応じて囲む。
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // **bold** だけを対象にする。分割して奇数番目を <strong> に。
  return text.split(/\*\*/g).map((chunk, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyPrefix}-b${i}`} lang="hy">
        {chunk}
      </strong>
    ) : (
      <Fragment key={`${keyPrefix}-t${i}`}>{chunk}</Fragment>
    ),
  );
}

function splitRow(row: string): string[] {
  return row
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function Markdownish({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={i} className="mt-4 font-bold text-ink">
          {renderInline(line.slice(4), `h${i}`)}
        </h3>,
      );
      i += 1;
      continue;
    }

    // 表: 連続する | 行。2行目が区切り (---) ならヘッダ扱い。
    if (line.trimStart().startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        rows.push(lines[i]);
        i += 1;
      }
      const isDivider = (r: string) => /^\s*\|?[\s:-]+\|[\s:|-]*$/.test(r);
      const bodyRows = rows.filter((r) => !isDivider(r)).map(splitRow);
      blocks.push(
        <div key={`tbl${i}`} className="mt-2 overflow-x-auto">
          <table className="border-collapse text-sm">
            <tbody>
              {bodyRows.map((cells, r) => (
                <tr key={r}>
                  {cells.map((cell, c) => (
                    <td key={c} className="border border-gold/30 px-2 py-1 align-top">
                      {renderInline(cell, `t${i}-${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // 箇条書き: 連続する "- " 行。
    if (line.trimStart().startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("- ")) {
        items.push(lines[i].trimStart().slice(2));
        i += 1;
      }
      blocks.push(
        <ul key={`ul${i}`} className="mt-2 list-disc space-y-1 pl-5">
          {items.map((item, k) => (
            <li key={k}>{renderInline(item, `li${i}-${k}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    blocks.push(
      <p key={i} className="mt-2 leading-relaxed">
        {renderInline(line, `p${i}`)}
      </p>,
    );
    i += 1;
  }

  return <div className="text-ink/90">{blocks}</div>;
}
