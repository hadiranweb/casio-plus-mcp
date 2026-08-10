// AUTO-GENERATED from core/primitives/*.schema.yaml — do not edit. Run: npm run gen:schemas

export interface AssetStatus {
  asset_type: string;
  status: "draft_vessel" | "evidence_collected" | "published" | "retired";
  readiness: "needs_definition" | "templates_only" | "evidence_based" | "mature";
  evidence_count: number;
  owner?: string;
  return_path?: string;
}

export interface AutomationSpec {
  id: string;
  title: string;
  owner?: string;
  inputData: string[];
  outputData: string[];
  processingLogic?: string;
  exceptions?: string[];
  acceptanceCriteria: string[];
  riskLevel: "low" | "medium" | "high";
  requiredPermission?: string;
  status: "disabled_until_approved" | "draft" | "pending_approval" | "approved" | "rejected" | "retired";
  approval?: { reviewer?: string; decidedAt?: string; note?: string };
}

export interface DataModel {
  id: string;
  title: string;
  entities?: string[];
  relations?: string[];
}

export interface Decision {
  id: string;
  title: string;
  status: "draft" | "made" | "revisited";
  owner?: string;
  context?: string;
  alternatives?: string[];
  chosen?: string;
  rationale?: string;
}

export interface Evidence {
  evidence_id: string;
  source: "field_observation" | "coaching_session" | "customer_interaction" | "manual_inventory" | "pilot_result" | "tool_usage_log" | "migration_legacy";
  observer: string;
  observed_at: string;
  raw_payload: { summary: string; details?: string };
  related_domain: string;
  confidence: number;
  provenance: { origin_system: string; capture_method: string; capture_context?: string };
  privacy_classification: "internal" | "confidential";
  review_status: "unreviewed" | "triaged" | "accepted" | "rejected";
  linked_assets?: string[];
  created_at: string;
}

export interface Feedback {
  sourceSystem: string;
  sourceType: string;
  submittedBy: string;
  relatedAssetId: number;
  summary: string;
  occurredAt?: string;
  payload?: Record<string, unknown>;
  fingerprint?: string;
  quality_status: "raw" | "quarantined" | "validated" | "rejected";
  review_status: "pending_review" | "approved" | "rejected";
}

export interface Playbook {
  id: string;
  title: string;
  status: "draft" | "active" | "retired";
  owner?: string;
  source?: "field_discovery_required" | "field_observation" | "migration_legacy" | "template";
  evidence_count?: number;
  readiness?: "needs_definition" | "templates_only" | "evidence_based" | "mature";
  return_path?: string;
  domains?: string[];
  data_model?: { inputs?: string[]; outputs?: string[] };
  acceptance_criteria?: string[];
  asset_status?: "draft_vessel" | "evidence_collected" | "published" | "retired";
}

export interface Registry {
  id: string;
  title: string;
  status: "schema_only" | "populated";
  owner?: string;
  columns?: string[];
  rows?: Record<string, unknown>;
}

export interface Template {
  id: string;
  title: string;
  status: "draft" | "active" | "retired";
  owner?: string;
  sections?: string[];
  example?: string;
}

export interface VersionProposal {
  id: string;
  status: "pending_human_merge" | "merged" | "discarded";
  feedbackId: string;
  relatedAssetId: number;
  baseKnowledgeVersion: string;
  createdBy: string;
  rationale: string;
  suggestedTargets?: string[];
  candidatePatch: { source_feedback_id: string; source_system: string; source_type: string; observation: string; occurred_at?: string; proposed_review_note: string };
}

export interface Workflow {
  id: string;
  title: string;
  status: "draft" | "discovered" | "automated";
  owner?: string;
  stages?: string[];
  data_return_paths?: string[];
}
