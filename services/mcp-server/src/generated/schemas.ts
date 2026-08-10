// AUTO-GENERATED from core/primitives/*.schema.yaml — do not edit. Run: npm run gen:schemas
import { z } from "zod";

export const asset_statusSchema = z.object({
  asset_type: z.string(),
  status: z.enum(["draft_vessel","evidence_collected","published","retired"] as [string, ...string[]]).default("draft_vessel"),
  readiness: z.enum(["needs_definition","templates_only","evidence_based","mature"] as [string, ...string[]]).default("needs_definition"),
  evidence_count: z.number().min(0).max(100000).default(0),
  owner: z.string().optional(),
  return_path: z.string().optional(),
});

export const automation_specSchema = z.object({
  id: z.string(),
  title: z.string(),
  owner: z.string().optional(),
  inputData: z.array(z.string()),
  outputData: z.array(z.string()),
  processingLogic: z.string().optional(),
  exceptions: z.array(z.string()).optional(),
  acceptanceCriteria: z.array(z.string()),
  riskLevel: z.enum(["low","medium","high"] as [string, ...string[]]).default("low"),
  requiredPermission: z.string().optional(),
  status: z.enum(["disabled_until_approved","draft","pending_approval","approved","rejected","retired"] as [string, ...string[]]).default("disabled_until_approved"),
  approval: z.object({
      reviewer: z.string().optional(),
      decidedAt: z.string().datetime().optional(),
      note: z.string().optional(),
    }).optional(),
});

export const data_modelSchema = z.object({
  id: z.string(),
  title: z.string(),
  entities: z.array(z.string()).optional(),
  relations: z.array(z.string()).optional(),
});

export const decisionSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["draft","made","revisited"] as [string, ...string[]]).default("draft"),
  owner: z.string().optional(),
  context: z.string().optional(),
  alternatives: z.array(z.string()).optional(),
  chosen: z.string().optional(),
  rationale: z.string().optional(),
});

export const evidenceSchema = z.object({
  evidence_id: z.string(),
  source: z.enum(["field_observation","coaching_session","customer_interaction","manual_inventory","pilot_result","tool_usage_log","migration_legacy"] as [string, ...string[]]),
  observer: z.string(),
  observed_at: z.string().datetime(),
  raw_payload: z.object({
      summary: z.string(),
      details: z.string().optional(),
    }),
  related_domain: z.string(),
  confidence: z.number().min(0).max(1).default(0.5),
  provenance: z.object({
      origin_system: z.string().default("casio-operator"),
      capture_method: z.string().default("manual_observation"),
      capture_context: z.string().optional(),
    }),
  privacy_classification: z.enum(["internal","confidential"] as [string, ...string[]]).default("internal"),
  review_status: z.enum(["unreviewed","triaged","accepted","rejected"] as [string, ...string[]]).default("unreviewed"),
  linked_assets: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});

export const feedbackSchema = z.object({
  sourceSystem: z.string(),
  sourceType: z.string(),
  submittedBy: z.string(),
  relatedAssetId: z.number(),
  summary: z.string(),
  occurredAt: z.string().datetime().optional(),
  payload: z.record(z.unknown()).optional(),
  fingerprint: z.string().optional(),
  quality_status: z.enum(["raw","quarantined","validated","rejected"] as [string, ...string[]]).default("raw"),
  review_status: z.enum(["pending_review","approved","rejected"] as [string, ...string[]]).default("pending_review"),
});

export const playbookSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["draft","active","retired"] as [string, ...string[]]).default("draft"),
  owner: z.string().optional(),
  source: z.enum(["field_discovery_required","field_observation","migration_legacy","template"] as [string, ...string[]]).default("field_discovery_required"),
  evidence_count: z.number().min(0).max(100000).default(0),
  readiness: z.enum(["needs_definition","templates_only","evidence_based","mature"] as [string, ...string[]]).default("needs_definition"),
  return_path: z.string().optional(),
  domains: z.array(z.string()).optional(),
  data_model: z.object({
      inputs: z.array(z.string()).optional(),
      outputs: z.array(z.string()).optional(),
    }).optional(),
  acceptance_criteria: z.array(z.string()).optional(),
  asset_status: z.enum(["draft_vessel","evidence_collected","published","retired"] as [string, ...string[]]).default("draft_vessel"),
});

export const registrySchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["schema_only","populated"] as [string, ...string[]]).default("schema_only"),
  owner: z.string().optional(),
  columns: z.array(z.string()).optional(),
  rows: z.record(z.unknown()).optional(),
});

export const templateSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["draft","active","retired"] as [string, ...string[]]).default("draft"),
  owner: z.string().optional(),
  sections: z.array(z.string()).optional(),
  example: z.string().optional(),
});

export const version_proposalSchema = z.object({
  id: z.string(),
  status: z.enum(["pending_human_merge","merged","discarded"] as [string, ...string[]]).default("pending_human_merge"),
  feedbackId: z.string(),
  relatedAssetId: z.number(),
  baseKnowledgeVersion: z.string(),
  createdBy: z.string(),
  rationale: z.string(),
  suggestedTargets: z.array(z.string()).optional(),
  candidatePatch: z.object({
      source_feedback_id: z.string(),
      source_system: z.string(),
      source_type: z.string(),
      observation: z.string(),
      occurred_at: z.string().datetime().optional(),
      proposed_review_note: z.string(),
    }),
});

export const workflowSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["draft","discovered","automated"] as [string, ...string[]]).default("draft"),
  owner: z.string().optional(),
  stages: z.array(z.string()).optional(),
  data_return_paths: z.array(z.string()).optional(),
});

export const PRIMITIVE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  asset_status: asset_statusSchema,
  automation_spec: automation_specSchema,
  data_model: data_modelSchema,
  decision: decisionSchema,
  evidence: evidenceSchema,
  feedback: feedbackSchema,
  playbook: playbookSchema,
  registry: registrySchema,
  template: templateSchema,
  version_proposal: version_proposalSchema,
  workflow: workflowSchema,
};
