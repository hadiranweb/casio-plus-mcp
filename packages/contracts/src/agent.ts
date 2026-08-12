import { z } from "zod";
import { idSchema } from "./common/ids.js";
import { memoryPolicySchema } from "./island.js";
export const agentSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  runtimeBindingId: idSchema,
  authorityPolicy: z.string().min(1),
  description: z.string().min(1).optional(),
  instructionRef: z.string().min(1).optional(),
  modelPolicy: z.string().min(1).optional(),
  skillRefs: z.array(idSchema).default([]),
  toolRefs: z.array(idSchema).default([]),
  memoryPolicy: memoryPolicySchema.optional(),
  status: z.enum(["draft", "ready", "suspended", "retired"]),
});
export type Agent = z.infer<typeof agentSchema>;
