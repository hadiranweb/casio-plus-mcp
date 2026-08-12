import { z } from "zod";
import { contentRefSchema, idSchema, semverSchema } from "./common/ids.js";
import { provenanceSchema } from "./common/provenance.js";
export const knowledgeSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  version: semverSchema,
  contentRef: contentRefSchema,
  evidenceRefs: z.array(idSchema).min(1),
  status: z.enum(["proposed", "review", "published", "superseded", "archived"]),
  provenance: provenanceSchema,
});
export const versionProposalSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  subjectType: z.enum(["knowledge", "process", "island", "asset", "skill"]),
  subjectId: idSchema,
  baseVersion: semverSchema,
  proposedChange: z.unknown(),
  evidenceRefs: z.array(idSchema).min(1),
  createdBy: idSchema,
  status: z.enum(["draft", "pending_review", "approved", "rejected", "merged"]),
});
export type Knowledge = z.infer<typeof knowledgeSchema>;
export type VersionProposal = z.infer<typeof versionProposalSchema>;
