import { z } from "zod";
import { idSchema, semverSchema } from "./ids.js";

export const typedRefSchema = z.object({
  type: z.string().min(1),
  id: idSchema,
});
export const versionedRefSchema = typedRefSchema.extend({
  version: semverSchema,
});
export const actorRefSchema = z.object({
  actorType: z.enum(["user", "agent", "system", "service"]),
  actorId: idSchema,
});
export const addressSchema = z.object({
  workspaceId: idSchema,
  islandId: idSchema.optional(),
  capabilityId: idSchema.optional(),
  actorId: idSchema.optional(),
});
