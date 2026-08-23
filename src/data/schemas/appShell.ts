import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";

export const appShellSchema = z.object({
  greeting: contentEntryBaseSchema.extend({
    text: z.string().min(1),
    translation: z.string().min(1),
  }),
});

export type AppShellContent = z.infer<typeof appShellSchema>;
