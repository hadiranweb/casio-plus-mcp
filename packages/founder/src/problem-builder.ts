import {
  problemSpecificationDraftSchema,
  type StructuredLlm,
} from "./structured-outputs";
export async function buildDraft(rawStatement: string, llm: StructuredLlm) {
  if (!rawStatement.trim()) throw new Error("raw_statement_required");
  const candidate = await llm.propose(rawStatement);
  return problemSpecificationDraftSchema.parse(candidate);
}
