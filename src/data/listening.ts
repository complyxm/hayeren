import listeningRaw from "../../content/listening.json";
import { listeningFileSchema, type ListeningPair } from "./schemas/listening";

const parsed = listeningFileSchema.parse(listeningRaw);

/** 聞き分けの2項対立の一覧。順番はそのまま出題順（易しい順）に使う。 */
export const listeningPairs: ListeningPair[] = parsed.pairs;

export function listeningPairById(pairId: string): ListeningPair | undefined {
  return listeningPairs.find((p) => p.pairId === pairId);
}
