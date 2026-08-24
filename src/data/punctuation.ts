import punctuationData from "../../content/punctuation.json";
import { punctuationSchema, type PunctuationMark } from "./schemas/punctuation";

export const punctuationMarks: PunctuationMark[] = punctuationSchema.parse(punctuationData);
