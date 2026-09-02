import { scenarioFileSchema, type Scenario } from "./schemas/scenarios";

/**
 * content/scenarios/ は 1場面1ファイル。新しい場面ファイルを足してもこのローダーは
 * 変更不要（import.meta.glob が列挙する）。メーターの並びは order で決める。
 */
const scenarioModules = import.meta.glob<{ default: unknown }>("../../content/scenarios/*.json", {
  eager: true,
});

export const scenarios: Scenario[] = Object.values(scenarioModules)
  .map((mod) => scenarioFileSchema.parse(mod.default))
  .sort((a, b) => a.order - b.order);
