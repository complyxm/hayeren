import metroData from "../../content/metro.json";
import { metroSchema, type MetroStation } from "./schemas/metro";

export const metroStations: MetroStation[] = metroSchema.parse(metroData);
