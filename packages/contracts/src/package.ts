import { z } from "zod";
import { idSchema, timestampSchema } from "./common/ids.js";
import { actorRefSchema, addressSchema } from "./common/references.js";
import { provenanceSchema } from "./common/provenance.js";
export const packageSchema = z.object({
  packageId: idSchema,
  packageType: z.enum([
    "command",
    "event",
    "query",
    "response",
    "result",
    "evidence",
  ]),
  source: addressSchema,
  destination: addressSchema,
  correlationId: idSchema,
  causationId: idSchema.nullable(),
  createdAt: timestampSchema,
  actor: actorRefSchema,
  payload: z.union([z.record(z.unknown()), z.string().min(1)]),
  payloadSchema: z.string().min(1).optional(),
  provenance: provenanceSchema,
  signature: z.string().min(1).optional(),
});
export type ElementPackage = z.infer<typeof packageSchema>;
