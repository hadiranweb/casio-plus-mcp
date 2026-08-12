import { z } from "zod";
import { idSchema, timestampSchema } from "./common/ids.js";
export const feedbackSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  subjectType: z.string().min(1),
  subjectId: idSchema,
  submittedBy: idSchema,
  content: z.string().min(1),
  createdAt: timestampSchema,
  status: z.enum(["raw", "validated", "rejected", "promoted"]),
});
export type Feedback = z.infer<typeof feedbackSchema>;
