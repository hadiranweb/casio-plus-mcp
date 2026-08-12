import { z } from "zod";

/** The only contract in Sprint 00: a version marker for later canonical schemas. */
export const contractMetadataSchema = z.object({
  schemaVersion: z.literal("1"),
});
export type ContractMetadata = z.infer<typeof contractMetadataSchema>;
