import { z } from "zod";
import { idSchema } from "./common/ids.js";
import { effectClassSchema } from "./process.js";
export const capabilitySchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  inputContract: z.string().min(1),
  outputContract: z.string().min(1),
  effectClass: effectClassSchema,
});
export type Capability = z.infer<typeof capabilitySchema>;
