import fs from "node:fs";
import path from "node:path";
import { stringify } from "yaml";
import { loadPlatformKernel, type PlatformKernel } from "./platform-kernel.js";

/**
 * Platform Seed templates — the generic, organization-agnostic drafts.
 *
 * These are VESSELS, not content: a playbook template is a playbook-shaped
 * empty container (owner null, readiness needs_definition, evidence 0) that
 * the organization fills with real field evidence. Creating a draft never
 * fabricates a decision, a lead or a process.
 */

export type DraftAsset = {
  type: string;
  title: string;
  status: "draft";
  owner: string | null;
  source: "field_discovery_required" | string;
  evidence_count: number;
  readiness: "needs_definition" | "templates_only";
  return_path: string | null;
  [key: string]: unknown;
};

const DRAFT_PREFIX: Record<string, { title: string; fields: Record<string, unknown> }> = {
  playbook: {
    title: "پلی‌بوک",
    fields: {
      domains: [],
      data_model: { inputs: [], outputs: [] },
      acceptance_criteria: [],
    },
  },
  template: {
    title: "قالب",
    fields: { sections: [], example: null },
  },
  decision: {
    title: "تصمیم",
    fields: { context: null, alternatives: [], chosen: null, rationale: null },
  },
  registry: {
    title: "رجیستری",
    fields: { columns: [], rows: [] },
  },
  workflow_map: {
    title: "نقشه فرایند",
    fields: { stages: [], data_return_paths: [] },
  },
  data_model: {
    title: "مدل داده",
    fields: { entities: [], relations: [] },
  },
  automation_spec: {
    title: "مشخصات اتوماسیون",
    fields: {
      input_data: [],
      output_data: [],
      processing_logic: null,
      exceptions: [],
      acceptance_criteria: [],
      risk_level: "low",
      required_permission: null,
      status: "disabled_until_approved",
    },
  },
};

export function draftTitles(kernel: PlatformKernel): Record<string, string> {
  const titles: Record<string, string> = {};
  for (const primitive of kernel.primitives) {
    if (DRAFT_PREFIX[primitive]) titles[primitive] = DRAFT_PREFIX[primitive].title;
  }
  return titles;
}

/**
 * Create a draft asset from a platform template. Pure — returns the draft;
 * optionally writes it to the workspace drafts dir when `outDir` is given.
 */
export function createAssetFromTemplate(
  type: string,
  title: string,
  opts: { kernel?: PlatformKernel; overrides?: Record<string, unknown> } = {},
): DraftAsset {
  const kernel = opts.kernel ?? loadPlatformKernel();
  if (!kernel.primitives.includes(type)) {
    throw new Error(`unknown_primitive:${type}`);
  }
  const prefix = DRAFT_PREFIX[type];
  if (!prefix) {
    throw new Error(`no_template_for_primitive:${type}`);
  }
  const titleValue = title.trim() || `${prefix.title} (بدون نام — نیازمند تعریف)`;
  const asset: DraftAsset = {
    type,
    title: titleValue,
    status: "draft",
    owner: null,
    source: "field_discovery_required",
    evidence_count: 0,
    readiness: "needs_definition",
    return_path: null,
    ...prefix.fields,
    ...(opts.overrides ?? {}),
  };
  return asset;
}

/** Persist a draft asset as YAML into the workspace drafts dir (gitignored). */
export function saveDraftAsset(asset: DraftAsset, dataDir: string): string {
  const dir = path.join(dataDir, "drafts");
  fs.mkdirSync(dir, { recursive: true });
  const slug = `${asset.type}-${Date.now()}.yaml`;
  const file = path.join(dir, slug);
  fs.writeFileSync(file, stringify(asset), "utf8");
  return file;
}
