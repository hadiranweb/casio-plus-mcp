import { z } from "zod";
import { idSchema, semverSchema } from "./common/ids.js";
import { provenanceSchema } from "./common/provenance.js";
export const memoryPolicySchema = z.object({
  writableScopes: z.array(
    z.enum(["user", "workspace", "island", "agent", "run", "ecosystem"]),
  ),
  readableScopes: z.array(
    z.enum(["user", "workspace", "island", "agent", "run", "ecosystem"]),
  ),
  allowedTypes: z.array(
    z.enum([
      "working",
      "preference",
      "evidence",
      "knowledge",
      "execution",
      "feedback",
    ]),
  ),
  retention: z.string().min(1),
  promotionRequiresReview: z.literal(true),
  crossWorkspaceAccess: z.literal(false),
});
export const runtimeBindingSchema = z
  .object({
    id: idSchema,
    runtimeType: z.enum(["openclaw", "native", "external"]),
    targetRef: z.string().min(1),
    capabilities: z.array(idSchema),
    status: z.enum(["configured", "ready", "degraded", "disabled"]),
    configurationRef: z.string().min(1).optional(),
  })
  .superRefine((binding, ctx) => {
    if (/secret|token|password|api[_-]?key/i.test(binding.targetRef))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Runtime targetRef must not contain plaintext credentials",
      });
  });
export const islandSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string().min(1),
  version: semverSchema,
  capabilities: z.array(idSchema).min(1),
  inputContract: z.string().min(1),
  outputContract: z.string().min(1),
  authorityPolicy: z.string().min(1),
  memoryPolicy: memoryPolicySchema,
  runtimeBindings: z.array(idSchema),
  processRefs: z.array(idSchema).default([]),
  status: z.enum([
    "draft",
    "validating",
    "active",
    "suspended",
    "deprecated",
    "archived",
  ]),
  provenance: provenanceSchema,
});
export type Island = z.infer<typeof islandSchema>;
export type RuntimeBinding = z.infer<typeof runtimeBindingSchema>;
export type MemoryPolicy = z.infer<typeof memoryPolicySchema>;
