import { describe, expect, it } from "vitest";
import {
  agentSchema,
  approvalSchema,
  artifactSchema,
  assetSchema,
  auditEventSchema,
  capabilitySchema,
  evidenceSchema,
  evaluationSchema,
  feedbackSchema,
  islandSchema,
  knowledgeSchema,
  memoryEntrySchema,
  packageSchema,
  problemSpecificationSchema,
  processSchema,
  runtimeBindingSchema,
  runSchema,
  toolCallSchema,
  toolSchema,
  versionProposalSchema,
} from "./index.js";

const id = "550e8400-e29b-41d4-a716-446655440000";
const id2 = "550e8400-e29b-41d4-a716-446655440001";
const now = "2026-08-13T00:00:00.000Z";
const actor = { actorType: "user" as const, actorId: id };
const provenance = {
  createdBy: actor,
  createdAt: now,
  sourceRefs: [{ type: "user", id }],
};
const memoryPolicy = {
  writableScopes: ["workspace" as const],
  readableScopes: ["workspace" as const],
  allowedTypes: ["working" as const],
  retention: "workspace_policy",
  promotionRequiresReview: true as const,
  crossWorkspaceAccess: false as const,
};

describe("canonical schemas", () => {
  it("serializes every Sprint 01 canonical contract", () => {
    const schemasAndValues = [
      [
        problemSpecificationSchema,
        {
          id,
          problemId: id2,
          workspaceId: id,
          version: "1.0.0",
          objective: "Understand",
          currentState: {},
          desiredState: {},
          constraints: [],
          successCriteria: ["clear"],
          evidenceRefs: [id],
          createdAt: now,
          provenance,
        },
      ],
      [
        evidenceSchema,
        {
          id,
          workspaceId: id,
          source: "user",
          sourceType: "user",
          capturedAt: now,
          provenance,
          status: "raw",
        },
      ],
      [
        processSchema,
        {
          id,
          workspaceId: id,
          name: "analysis",
          version: "1.0.0",
          inputContract: "input",
          steps: [
            {
              id: id2,
              name: "read",
              kind: "human",
              inputRefs: [],
              outputContract: "output",
            },
          ],
          outputContract: "output",
          successCriteria: ["done"],
          status: "draft",
          provenance,
        },
      ],
      [
        capabilitySchema,
        {
          id,
          name: "analyse",
          inputContract: "input",
          outputContract: "output",
          effectClass: "read_only",
        },
      ],
      [
        islandSchema,
        {
          id,
          workspaceId: id,
          name: "Analysis",
          version: "1.0.0",
          capabilities: [id2],
          inputContract: "input",
          outputContract: "output",
          authorityPolicy: "deny_by_default",
          memoryPolicy,
          runtimeBindings: [],
          status: "draft",
          provenance,
        },
      ],
      [
        runtimeBindingSchema,
        {
          id,
          runtimeType: "native",
          targetRef: "analysis-runtime",
          capabilities: [id2],
          status: "ready",
        },
      ],
      [
        agentSchema,
        {
          id,
          name: "analyst",
          runtimeBindingId: id2,
          authorityPolicy: "deny_by_default",
          status: "draft",
        },
      ],
      [
        toolSchema,
        {
          id,
          name: "inspect",
          inputSchema: "input",
          outputSchema: "output",
          effectClass: "read_only",
          permissionPolicy: "deny_by_default",
          auditRequired: true,
        },
      ],
      [
        packageSchema,
        {
          packageId: id,
          packageType: "command",
          source: { workspaceId: id },
          destination: { workspaceId: id2 },
          correlationId: id2,
          causationId: null,
          createdAt: now,
          actor,
          payload: { value: "ok" },
          provenance,
        },
      ],
      [
        runSchema,
        {
          runId: id,
          workspaceId: id,
          subjectType: "island",
          subjectId: id2,
          subjectVersion: "1.0.0",
          initiatedBy: actor,
          correlationId: id2,
          runtimeBindingRef: id2,
          inputSnapshot: "object://input",
          status: "created",
          startedAt: now,
          endedAt: null,
        },
      ],
      [
        toolCallSchema,
        {
          id,
          workspaceId: id,
          runId: id2,
          toolId: id,
          actorId: id,
          requestedInput: {},
          effectClass: "read_only",
          permissionDecision: "allow",
          status: "requested",
        },
      ],
      [
        approvalSchema,
        {
          id,
          workspaceId: id,
          subjectType: "tool_call",
          subjectId: id2,
          requestedBy: id,
          decision: "approved",
          decidedBy: id,
          decidedAt: now,
        },
      ],
      [
        artifactSchema,
        {
          id,
          workspaceId: id,
          kind: "analysis",
          contentRef: "object://result",
          createdBy: id,
          createdAt: now,
          provenance,
        },
      ],
      [
        evaluationSchema,
        {
          id,
          workspaceId: id,
          subjectType: "run",
          subjectId: id2,
          criteria: ["valid"],
          outcome: "passed",
          evidenceRefs: [id],
          createdAt: now,
        },
      ],
      [
        feedbackSchema,
        {
          id,
          workspaceId: id,
          subjectType: "run",
          subjectId: id2,
          submittedBy: id,
          content: "useful",
          createdAt: now,
          status: "raw",
        },
      ],
      [
        memoryEntrySchema,
        {
          id,
          workspaceId: id,
          scope: "workspace",
          scopeId: id,
          memoryType: "working",
          contentRef: "object://memory",
          sourceRefs: [{ type: "run", id: id2 }],
          createdAt: now,
          status: "candidate",
        },
      ],
      [
        knowledgeSchema,
        {
          id,
          workspaceId: id,
          version: "1.0.0",
          contentRef: "object://knowledge",
          evidenceRefs: [id2],
          status: "proposed",
          provenance,
        },
      ],
      [
        versionProposalSchema,
        {
          id,
          workspaceId: id,
          subjectType: "knowledge",
          subjectId: id2,
          baseVersion: "1.0.0",
          proposedChange: {},
          evidenceRefs: [id],
          createdBy: id,
          status: "draft",
        },
      ],
      [
        assetSchema,
        {
          id,
          ownerId: id,
          workspaceId: id,
          assetType: "island",
          version: "1.0.0",
          subjectRef: { type: "island", id: id2, version: "1.0.0" },
          visibility: "private",
          licensePolicy: "MIT",
          status: "draft",
          provenance,
        },
      ],
      [
        auditEventSchema,
        {
          id,
          actorId: id,
          action: "created",
          subjectType: "run",
          subjectId: id2,
          timestamp: now,
          correlationId: id,
        },
      ],
    ] as const;
    for (const [schema, value] of schemasAndValues)
      expect(JSON.parse(JSON.stringify(schema.parse(value)))).toBeDefined();
  });

  it("rejects malformed identifiers, plaintext runtime credentials, and public datasets without rights", () => {
    expect(problemSpecificationSchema.safeParse({}).success).toBe(false);
    expect(
      runtimeBindingSchema.safeParse({
        id,
        runtimeType: "openclaw",
        targetRef: "https://host?token=plaintext",
        capabilities: [],
        status: "ready",
      }).success,
    ).toBe(false);
    expect(
      assetSchema.safeParse({
        id,
        ownerId: id,
        workspaceId: id,
        assetType: "dataset",
        version: "1.0.0",
        subjectRef: { type: "dataset", id: id2, version: "1.0.0" },
        visibility: "public",
        licensePolicy: "custom",
        status: "draft",
        provenance,
      }).success,
    ).toBe(false);
  });
});
