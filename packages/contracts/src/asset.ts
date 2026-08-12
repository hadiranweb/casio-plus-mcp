import { z } from "zod";
import { idSchema, semverSchema } from "./common/ids.js";
import { provenanceSchema } from "./common/provenance.js";
import { versionedRefSchema } from "./common/references.js";
export const artifactSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  runId: idSchema.optional(),
  kind: z.string().min(1),
  contentRef: z.string().min(1),
  createdBy: idSchema,
  createdAt: z.string().datetime({ offset: true }),
  provenance: provenanceSchema,
});
export const assetSchema = z
  .object({
    id: idSchema,
    ownerId: idSchema,
    workspaceId: idSchema,
    assetType: z.enum([
      "island",
      "process",
      "skill",
      "template",
      "knowledge_package",
      "evaluation_pack",
      "connector",
      "dataset",
    ]),
    version: semverSchema,
    subjectRef: versionedRefSchema,
    visibility: z.enum(["private", "workspace", "unlisted", "public"]),
    licensePolicy: z.string().min(1),
    status: z.enum(["draft", "review", "published", "deprecated", "withdrawn"]),
    provenance: provenanceSchema,
    rightsBasis: z.string().min(1).optional(),
  })
  .superRefine((asset, ctx) => {
    if (
      asset.assetType === "dataset" &&
      asset.visibility === "public" &&
      !asset.rightsBasis
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Public datasets require explicit rightsBasis",
      });
  });
export type Artifact = z.infer<typeof artifactSchema>;
export type Asset = z.infer<typeof assetSchema>;
