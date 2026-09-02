import signsRaw from "../../content/signs.json";
import { signsFileSchema, type Sign } from "./schemas/signs";

export const signs: Sign[] = signsFileSchema.parse(signsRaw);
