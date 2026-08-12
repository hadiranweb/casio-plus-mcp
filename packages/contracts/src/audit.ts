import { z } from "zod";
import { idSchema, timestampSchema } from "./common/ids.js";
export const auditEventSchema = z
  .object({
    id: idSchema,
    workspaceId: idSchema.optional(),
    actorId: idSchema,
    action: z.string().min(1),
    subjectType: z.string().min(1),
    subjectId: idSchema,
    timestamp: timestampSchema,
    correlationId: idSchema,
    metadata: z.record(z.unknown()).default({}),
  })
  .readonly();
export type AuditEvent = z.infer<typeof auditEventSchema>;
