import listeningRaw from "../../content/listening.json";
import { listeningFileSchema } from "./schemas/listening";

export const listening = listeningFileSchema.parse(listeningRaw);
