import { russianFileSchema, type RussianScene } from "./schemas/russian";

/** content/ru/ は 1場面1ファイル。アルメニア語の content/scenarios/ とは別ディレクトリ。 */
const russianModules = import.meta.glob<{ default: unknown }>("../../content/ru/*.json", { eager: true });

export const russianScenes: RussianScene[] = Object.values(russianModules)
  .map((mod) => russianFileSchema.parse(mod.default))
  .sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));
