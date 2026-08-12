import { z } from "zod";
import { idSchema } from "./common/ids.js";
import { effectClassSchema } from "./process.js";
export const toolSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  inputSchema: z.string().min(1),
  outputSchema: z.string().min(1),
  effectClass: effectClassSchema,
  permissionPolicy: z.string().min(1),
  timeout: z.string().min(1).optional(),
  idempotency: z
    .enum(["required", "supported", "not_supported"])
    .default("not_supported"),
  auditRequired: z.literal(true),
});
export type Tool = z.infer<typeof toolSchema>;
