import releaseNotesRaw from "../../content/release-notes.json";
import { releaseNotesFileSchema, type ReleaseNote } from "./schemas/releaseNotes";

/** 新しい順に並べて返す。content 側は古い順で書いてよい（履歴として読みやすいため）。 */
export const releaseNotes: ReleaseNote[] = releaseNotesFileSchema
  .parse(releaseNotesRaw)
  .slice()
  .sort((a, b) => b.date.localeCompare(a.date));
