import { z } from "zod";
import { contentRefSchema, idSchema, timestampSchema } from "./common/ids.js";
import { typedRefSchema } from "./common/references.js";
export const memoryEntrySchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  scope: z.enum(["user", "workspace", "island", "agent", "run", "ecosystem"]),
  scopeId: idSchema,
  memoryType: z.enum([
    "working",
    "preference",
    "evidence",
    "knowledge",
    "execution",
    "feedback",
  ]),
  contentRef: contentRefSchema,
  sourceRefs: z.array(typedRefSchema).min(1),
  createdAt: timestampSchema,
  status: z.enum(["candidate", "active", "expired", "deleted"]),
});
export type MemoryEntry = z.infer<typeof memoryEntrySchema>;
