import { z } from "zod";
import { idSchema, semverSchema } from "./common/ids.js";
import { provenanceSchema } from "./common/provenance.js";
export const effectClassSchema = z.enum([
  "read_only",
  "internal_write",
  "external_reversible",
  "external_irreversible",
]);
export const processStepSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  kind: z.enum([
    "human",
    "agent",
    "tool",
    "transform",
    "decision",
    "approval",
    "evaluation",
  ]),
  inputRefs: z.array(z.string()),
  outputContract: z.string().min(1),
  capabilityRef: idSchema.optional(),
  agentRequirement: z.string().min(1).optional(),
  toolRequirement: z.string().min(1).optional(),
  authorityRequirement: z.string().min(1).optional(),
  retryPolicy: z
    .object({
      maxAttempts: z.number().int().min(1),
      strategy: z.enum(["none", "fixed", "exponential"]),
      initialDelayMs: z.number().int().min(0),
      maxDelayMs: z.number().int().min(0),
      retryableErrors: z.array(z.string()),
    })
    .optional(),
  timeout: z.string().min(1).optional(),
  compensation: idSchema.optional(),
  effectClass: effectClassSchema.optional(),
});
export const processSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string().min(1),
  version: semverSchema,
  inputContract: z.string().min(1),
  steps: z.array(processStepSchema).min(1),
  outputContract: z.string().min(1),
  successCriteria: z.array(z.unknown()).min(1),
  status: z.enum([
    "draft",
    "review",
    "validated",
    "published",
    "deprecated",
    "archived",
  ]),
  provenance: provenanceSchema,
});
export type Process = z.infer<typeof processSchema>;
export type ProcessStep = z.infer<typeof processStepSchema>;
