import { z } from "zod";
import { contentRefSchema, idSchema, timestampSchema } from "./common/ids.js";
import { provenanceSchema } from "./common/provenance.js";
export const evidenceStatusSchema = z.enum([
  "raw",
  "quarantined",
  "validated",
  "rejected",
  "superseded",
]);
export const evidenceSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  source: z.string().min(1),
  sourceType: z.string().min(1),
  contentRef: contentRefSchema.optional(),
  capturedAt: timestampSchema,
  provenance: provenanceSchema,
  status: evidenceStatusSchema,
});
export type Evidence = z.infer<typeof evidenceSchema>;
