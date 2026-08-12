import { z } from "zod";
import { idSchema, semverSchema, timestampSchema } from "./common/ids.js";
import { provenanceSchema } from "./common/provenance.js";

export const problemSpecificationSchema = z.object({
  id: idSchema,
  problemId: idSchema,
  workspaceId: idSchema,
  version: semverSchema,
  objective: z.string().min(1),
  currentState: z.unknown(),
  desiredState: z.unknown(),
  constraints: z.array(z.unknown()),
  successCriteria: z.array(z.unknown()).min(1),
  evidenceRefs: z.array(idSchema),
  assumptions: z.array(z.unknown()).default([]),
  risks: z.array(z.unknown()).default([]),
  stakeholders: z.array(z.unknown()).default([]),
  availableData: z.array(z.unknown()).default([]),
  requiredCapabilities: z.array(idSchema).default([]),
  unknowns: z.array(z.unknown()).default([]),
  createdAt: timestampSchema,
  provenance: provenanceSchema,
});
export const problemSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  createdBy: idSchema,
  rawStatement: z.string().min(1),
  status: z.enum(["raw", "exploring", "structured", "resolved", "archived"]),
  createdAt: timestampSchema,
});
export type ProblemSpecification = z.infer<typeof problemSpecificationSchema>;
export type Problem = z.infer<typeof problemSchema>;
