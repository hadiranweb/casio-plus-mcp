import { z } from "zod";
import {
  contentRefSchema,
  idSchema,
  semverSchema,
  timestampSchema,
} from "./common/ids.js";
import { actorRefSchema } from "./common/references.js";
import { effectClassSchema } from "./process.js";
export const runStatusSchema = z.enum([
  "created",
  "authorizing",
  "queued",
  "running",
  "waiting_for_approval",
  "evaluating",
  "completed",
  "failed",
  "cancelled",
]);
export const runSchema = z.object({
  runId: idSchema,
  workspaceId: idSchema,
  subjectType: z.enum(["process", "island"]),
  subjectId: idSchema,
  subjectVersion: semverSchema,
  initiatedBy: actorRefSchema,
  correlationId: idSchema,
  runtimeBindingRef: idSchema,
  inputSnapshot: contentRefSchema,
  contextRefs: z.array(idSchema).default([]),
  evidenceRefs: z.array(idSchema).default([]),
  status: runStatusSchema,
  startedAt: timestampSchema,
  endedAt: timestampSchema.nullable(),
  toolCallRefs: z.array(idSchema).default([]),
  artifactRefs: z.array(idSchema).default([]),
  evaluationRefs: z.array(idSchema).default([]),
  errorRefs: z.array(idSchema).default([]),
});
export const toolCallSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  runId: idSchema,
  toolId: idSchema,
  actorId: idSchema,
  requestedInput: z.unknown(),
  effectClass: effectClassSchema,
  permissionDecision: z.enum(["allow", "deny", "prompt_for_approval"]),
  status: z.enum(["requested", "authorized", "executed", "denied", "failed"]),
});
export const approvalSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  subjectType: z.string().min(1),
  subjectId: idSchema,
  requestedBy: idSchema,
  decision: z.enum(["approved", "rejected"]),
  decidedBy: idSchema,
  decidedAt: timestampSchema,
});
export type Run = z.infer<typeof runSchema>;
export type ToolCall = z.infer<typeof toolCallSchema>;
export type Approval = z.infer<typeof approvalSchema>;
