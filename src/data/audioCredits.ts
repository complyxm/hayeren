import audioCreditsRaw from "../../content/audio-credits.json";
import { audioCreditsSchema, type AudioCredits } from "./schemas/audioCredits";

export const audioCredits: AudioCredits = audioCreditsSchema.parse(audioCreditsRaw);
