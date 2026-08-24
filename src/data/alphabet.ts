import alphabetData from "../../content/alphabet.json";
import { alphabetSchema, type Alphabet } from "./schemas/alphabet";

export const alphabet: Alphabet = alphabetSchema.parse(alphabetData);
