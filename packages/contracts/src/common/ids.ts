import { z } from "zod";

export const idSchema = z.string().uuid();
export const semverSchema = z
  .string()
  .regex(
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/,
    "Expected semantic version",
  );
export const timestampSchema = z.string().datetime({ offset: true });
export const contentRefSchema = z.string().min(1);
export const typedIdSchema = <T extends string>(type: T) =>
  z.object({ type: z.literal(type), id: idSchema });
