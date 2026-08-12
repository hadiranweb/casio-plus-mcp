import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  ELEMENT_PLUS_RUNTIME_MODE: z.enum(["fake", "openclaw"]).default("fake"),
  DATABASE_URL: z.string().url().optional(),
  OBJECT_STORAGE_PATH: z.string().min(1).default(".local/object-storage"),
  OPENCLAW_BASE_URL: z.string().url().optional(),
});

export type Environment = z.infer<typeof environmentSchema>;

export function readEnvironment(
  input: NodeJS.ProcessEnv = process.env,
): Environment {
  return environmentSchema.parse(input);
}
