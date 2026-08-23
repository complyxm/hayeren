import appShellData from "../../content/app-shell.json";
import { appShellSchema, type AppShellContent } from "./schemas/appShell";

export const appShell: AppShellContent = appShellSchema.parse(appShellData);
