import { z } from "zod";
import { timestampSchema } from "./ids.js";
import { actorRefSchema, typedRefSchema } from "./references.js";

export const provenanceSchema = z.object({
  createdBy: actorRefSchema,
  createdAt: timestampSchema,
  sourceRefs: z.array(typedRefSchema),
  derivedFrom: z.array(typedRefSchema).default([]),
  runId: z.string().uuid().optional(),
  transformation: z.string().min(1).optional(),
  integrityDigest: z.string().min(1).optional(),
});
export type Provenance = z.infer<typeof provenanceSchema>;
