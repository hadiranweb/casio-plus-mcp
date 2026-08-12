import { z } from "zod";
export const problemSpecificationDraftSchema = z.object({
  objective: z.string().min(1),
  currentState: z.string().min(1),
  desiredState: z.string().min(1),
  constraints: z.array(z.string()),
  successCriteria: z.array(z.string()).min(1),
  evidence: z.array(z.string()),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
});
export type ProblemSpecificationDraft = z.infer<
  typeof problemSpecificationDraftSchema
>;
export interface StructuredLlm {
  propose(rawStatement: string): Promise<unknown>;
}
export class FakeStructuredLlm implements StructuredLlm {
  async propose(rawStatement: string) {
    return {
      objective: `Understand: ${rawStatement}`,
      currentState: "Not yet structured",
      desiredState: "Structured problem",
      constraints: [],
      successCriteria: ["User confirms the specification"],
      evidence: [],
      assumptions: [],
      unknowns: ["Additional context may be needed"],
    };
  }
}
