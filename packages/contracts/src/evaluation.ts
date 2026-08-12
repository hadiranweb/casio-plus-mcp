import { z } from "zod";
import { idSchema, timestampSchema } from "./common/ids.js";
export const evaluationSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  subjectType: z.string().min(1),
  subjectId: idSchema,
  criteria: z.array(z.unknown()).min(1),
  outcome: z.enum(["passed", "failed", "partial", "not_verifiable"]),
  evidenceRefs: z.array(idSchema),
  createdAt: timestampSchema,
});
export type Evaluation = z.infer<typeof evaluationSchema>;
