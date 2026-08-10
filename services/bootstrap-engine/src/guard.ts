// Guard — قواعد No Fake Knowledge در materialization

export type MaterializeCheck = {
  type: string;
  payload: Record<string, unknown>;
};

export function assertNoFakeKnowledge(check: MaterializeCheck): void {
  const { type, payload } = check;

  // Playbook/template/decision etc must be template_only / schema_only, no fake content
  if (payload.asset_status && payload.asset_status !== "draft" && payload.asset_status !== "template_only" && payload.asset_status !== "schema_only" && payload.asset_status !== "evidence_collected") {
    // Allow evidence_collected only for migrated legacy (casio), not for new sandbox materialization
    // For new materialization, only draft/template_only/schema_only allowed
    if (type !== "migrated_legacy") {
      throw new Error(`no_fake_knowledge: asset_status ${payload.asset_status} not allowed for new materialization (type ${type})`);
    }
  }

  // Registry must be schema-only, no rows
  if (type === "registry" && Array.isArray(payload.rows) && (payload.rows as unknown[]).length > 0) {
    throw new Error("no_fake_knowledge: registry materialization must have rows: [] (schema_only)");
  }

  // Playbook must have empty domains or template_only
  if (type === "playbook" && payload.title && typeof payload.title === "string") {
    if (payload.title.includes("لورم") || payload.title.includes("fake")) {
      throw new Error("no_fake_knowledge: fake content detected in title");
    }
  }

  // Check for default non-structural values
  const json = JSON.stringify(payload);
  if (json.includes("لورم") || json.includes("fake") || json.includes("نمونه ساختگی")) {
    throw new Error("no_fake_knowledge: fake content detected");
  }
}

export function assertTemplateOnly(payload: Record<string, unknown>): void {
  assertNoFakeKnowledge({ type: payload.type as string ?? "unknown", payload });
  // Must be template_only or draft
  const status = payload.asset_status ?? payload.status;
  if (status && status !== "draft" && status !== "template_only" && status !== "schema_only") {
    throw new Error(`no_fake_knowledge: materialization must be template_only/schema_only, got ${status}`);
  }
}
