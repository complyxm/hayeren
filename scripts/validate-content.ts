import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { z } from "zod";
import { appShellSchema } from "../src/data/schemas/appShell";
import { alphabetSchema } from "../src/data/schemas/alphabet";
import { punctuationSchema } from "../src/data/schemas/punctuation";
import { metroSchema } from "../src/data/schemas/metro";
import { vocabFileSchema } from "../src/data/schemas/vocab";
import { audioCreditsSchema } from "../src/data/schemas/audioCredits";

const CONTENT_DIR = join(import.meta.dirname, "..", "content");

// ファイル名（content/ からの相対パス）ごとの検証スキーマ。
// Phase 1 以降、grammar/**.json 等がここに追加されていく想定。
const schemaByRelativePath: Record<string, z.ZodTypeAny> = {
  "app-shell.json": appShellSchema,
  "alphabet.json": alphabetSchema,
  "punctuation.json": punctuationSchema,
  "metro.json": metroSchema,
  "audio-credits.json": audioCreditsSchema,
};

// テーマごとに複数ファイルに分かれるディレクトリはプレフィックスで一括登録する。
const schemaByDirPrefix: Record<string, z.ZodTypeAny> = {
  "vocab/": vocabFileSchema,
};

function listJsonFilesRecursively(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      return listJsonFilesRecursively(fullPath);
    }
    return fullPath.endsWith(".json") ? [fullPath] : [];
  });
}

function schemaFor(relPath: string): z.ZodTypeAny | undefined {
  if (schemaByRelativePath[relPath]) return schemaByRelativePath[relPath];
  const prefix = Object.keys(schemaByDirPrefix).find((p) => relPath.startsWith(p));
  return prefix ? schemaByDirPrefix[prefix] : undefined;
}

function main(): void {
  if (!existsSync(CONTENT_DIR)) {
    console.log("content/ ディレクトリが存在しません。0件を検証してスキップしました。");
    return;
  }

  const files = listJsonFilesRecursively(CONTENT_DIR);
  if (files.length === 0) {
    console.log("content/ 配下に .json ファイルがありません。0件を検証してスキップしました。");
    return;
  }

  let hasError = false;

  for (const file of files) {
    const relPath = relative(CONTENT_DIR, file);
    const schema = schemaFor(relPath);
    if (!schema) {
      console.log(`[skip] ${relPath} — 対応するスキーマが未定義のためスキップ`);
      continue;
    }

    const raw: unknown = JSON.parse(readFileSync(file, "utf-8"));
    const result = schema.safeParse(raw);
    if (result.success) {
      console.log(`[OK]   ${relPath}`);
    } else {
      hasError = true;
      console.error(`[FAIL] ${relPath}`);
      console.error(result.error.format());
    }
  }

  if (hasError) {
    process.exit(1);
  }
}

main();
