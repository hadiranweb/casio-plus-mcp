import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { URL } from "node:url";
import { getPlaybook, loadKnowledge, searchPlaybooks } from "./knowledge-store.js";
import { listFeedbackQueue, submitFeedback } from "./intake-store.js";
import { listAuditEvents } from "./audit-store.js";
import { listVersionProposals } from "./proposal-store.js";
import { feedbackInputSchema, validateFeedback } from "./quality.js";
import { listWorkspaces, loadWorkspace, workspaceSummary, wsStorePaths } from "./workspace.js";
import { captureEvidence, listEvidence, triageEvidence } from "./evidence-store.js";
import { loadPlatformKernel, loadKernelVersion, loadKernelTools, loadEcosystemSpec } from "./platform-kernel.js";
import { createAssetFromTemplate, saveDraftAsset } from "./templates.js";
import { resolveActorFromRequest, type Actor } from "./actor.js";
import { requirePermission, assertWorkspaceAccess } from "./access.js";
import { ensureSeedUsers, login, verifyToken } from "./users.js";

const knowledge = loadKnowledge(process.env.CASIO_KNOWLEDGE_PATH);
const port = Number(process.env.CASIO_HTTP_PORT ?? 4110);

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body, null, 2));
}

function sendError(response: ServerResponse, status: number, error: unknown): void {
  send(response, status, { error: error instanceof Error ? error.message : String(error) });
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

function queryBool(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function wsParam(url: URL): string {
  return url.searchParams.get("workspace") ?? process.env.CASIO_WORKSPACE ?? "casio";
}

function displayDataDir(): string {
  return process.env.CASIO_DISPLAY_DATA_DIR ?? path.resolve(process.cwd(), "data/workspaces/display");
}
function authSecret(): string {
  return process.env.CASIO_AUTH_SECRET ?? "dev-secret-change-me";
}

/** try/catch wrapper for handlers: 400 on business errors, 500 on the rest. */
/** Map a caught error to an HTTP status: permission/tenant errors → 403. */
function statusForError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("permission_denied") || message.startsWith("workspace_forbidden")) return 403;
  return 400;
}

function guard(response: ServerResponse, fn: () => unknown): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then((value) => send(response, 200, value))
        .catch((error) => sendError(response, statusForError(error), error));
    } else {
      send(response, 200, result);
    }
  } catch (error) {
    sendError(response, statusForError(error), error);
  }
}

/**
 * Route → permission map for the bridge. Every endpoint except the health
 * check requires a permission from core/policies/rbac.yaml; writes require
 * write:knowledge / write:evidence depending on the action.
 */
function permissionForRoute(method: string, pathname: string): string | null {
  if (pathname === "/api/health") return null; // monitoring stays open
  if (method === "GET") return "read:knowledge";
  if (method === "POST" && pathname === "/api/workspaces") return "write:knowledge";
  if (method === "POST" && /\/api\/workspaces\/[a-z0-9-]+\/(capture|evidence)/.test(pathname)) return "write:evidence";
  if (method === "POST" && /\/api\/workspaces\/[a-z0-9-]+\/(assets|domains|owners)/.test(pathname)) return "write:knowledge";
  if (method === "POST" && pathname === "/api/feedback-intake") return "write:evidence";
  return null; // unknown route falls through to 404
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") return send(response, 204, {});
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

  // ── Auth endpoints (public — identity + session) ───────────────────────
  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    try {
      const body = (await readJson(request)) as { username?: string; password?: string };
      if (!body.username || !body.password) throw new Error("username and password are required");
      ensureSeedUsers(displayDataDir());
      const { user, token } = login(displayDataDir(), body.username, body.password, authSecret());
      return send(response, 200, { token, user: { username: user.username, role: user.role, workspace: user.workspace } });
    } catch (error) {
      return sendError(response, 401, error);
    }
  }
  if (request.method === "GET" && url.pathname === "/api/auth/me") {
    const auth = request.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const payload = token ? verifyToken(token, authSecret()) : null;
    if (!payload) return sendError(response, 401, "invalid_token");
    return send(response, 200, { subject: payload.sub, role: payload.role, workspace: payload.ws ?? null, exp: payload.exp });
  }

  // ── Identity + RBAC (people with different levels) ──────────────────────
  const getHeader = (name: string): string | null => request.headers[name]?.toString() ?? null;
  // A Bearer session token (from /api/auth/login) authenticates the actor:
  // its payload carries role + workspace scope.
  const bearer = request.headers.authorization?.startsWith("Bearer ") ? request.headers.authorization.slice(7) : null;
  const session = bearer ? verifyToken(bearer, authSecret()) : null;
  const resolved = session
    ? { actor: { subject: session.sub, role: session.role, workspace: session.ws, mode: "sso-proxy" as const } }
    : resolveActorFromRequest(getHeader);
  const permission = permissionForRoute(request.method ?? "GET", url.pathname);
  if (permission) {
    if ("error" in resolved) return sendError(response, 401, resolved.error);
    try {
      requirePermission(resolved.actor, permission);
    } catch (error) {
      return sendError(response, 403, error);
    }
  }
  const actor: Actor | undefined = "actor" in resolved ? resolved.actor : undefined;

  // -------------------------------------------------------------------------
  // Legacy (backward-compatible) endpoints — still served for existing clients
  // -------------------------------------------------------------------------
  if (request.method === "GET" && url.pathname === "/api/health") {
    const version = loadKernelVersion();
    return send(response, 200, {
      ok: true,
      service: "element-ecosystem",
      mode: "local-http-bridge",
      kernelVersion: version.kernel_version,
      specVersion: version.specification_version,
      authMode: process.env.CASIO_SSO_SHARED_SECRET ? "sso" : process.env.CASIO_SEED_USERS ? "users" : "local-role",
    });
  }
  if (request.method === "GET" && url.pathname === "/api/knowledge") return send(response, 200, { کاسیو: knowledge });
  if (request.method === "GET" && url.pathname === "/api/summary") {
    const knowledgeObj = knowledge as { meta?: unknown; دارایی_ها?: { پلی_بوک_ها?: unknown[] } };
    return send(response, 200, {
      version: knowledgeObj.meta ?? {},
      playbookCount: knowledgeObj.دارایی_ها?.پلی_بوک_ها?.length ?? 0,
    });
  }
  if (request.method === "GET" && url.pathname === "/api/architecture") {
    return send(response, 200, (knowledge as { معماری?: unknown }).معماری ?? {});
  }
  if (request.method === "GET" && url.pathname === "/api/learning") {
    return send(response, 200, (knowledge as { آموزش?: unknown }).آموزش ?? {});
  }

  if (request.method === "GET" && url.pathname === "/api/playbooks") {
    const playbooks = searchPlaybooks(knowledge as never, {
      query: url.searchParams.get("query") ?? undefined,
      domain: url.searchParams.get("domain") ?? undefined,
      role: url.searchParams.get("role") ?? undefined,
      level: url.searchParams.get("level") ?? undefined,
      assetType: url.searchParams.get("assetType") ?? undefined,
      readiness: (url.searchParams.get("readiness") as "داریم" | "لازم" | null) ?? undefined,
      development: queryBool(url.searchParams.get("development")),
    });
    return send(response, 200, { count: playbooks.length, playbooks });
  }

  const playbookMatch = /^\/api\/playbooks\/(\d+)$/.exec(url.pathname);
  if (request.method === "GET" && playbookMatch) {
    const playbook = getPlaybook(knowledge as never, Number(playbookMatch[1]));
    return playbook ? send(response, 200, playbook) : send(response, 404, { error: "playbook_not_found" });
  }

  if (request.method === "GET" && url.pathname === "/api/review-queue") {
    return send(response, 200, {
      records: listFeedbackQueue({
        qualityStatus: url.searchParams.get("qualityStatus") as never,
        reviewStatus: url.searchParams.get("reviewStatus") as never,
        limit: Number(url.searchParams.get("limit") ?? 50),
      }),
    });
  }
  if (request.method === "GET" && url.pathname === "/api/version-proposals") {
    return send(response, 200, { proposals: listVersionProposals(url.searchParams.get("status") as never) });
  }
  if (request.method === "GET" && url.pathname === "/api/audit-events") {
    return send(response, 200, { events: listAuditEvents(Number(url.searchParams.get("limit") ?? 50)) });
  }
  if (request.method === "POST" && url.pathname === "/api/feedback-intake") {
    try {
      const input = feedbackInputSchema.parse(await readJson(request));
      const report = validateFeedback(input, knowledge as never);
      const result = submitFeedback(input, report);
      return send(response, 200, {
        id: result.record.id,
        qualityStatus: result.record.qualityStatus,
        reviewStatus: result.record.reviewStatus,
        duplicateOf: result.duplicateOf ?? null,
        fuzzyDuplicateOf: result.fuzzyDuplicateOf ?? null,
      });
    } catch (error) {
      return sendError(response, 400, error);
    }
  }

  // -------------------------------------------------------------------------
  // Platform kernel (layer 1/2) — brand-agnostic status
  // -------------------------------------------------------------------------
  if (request.method === "GET" && url.pathname === "/api/platform/kernel") {
    return guard(response, () => {
      const kernel = loadPlatformKernel();
      const version = loadKernelVersion();
      const tools = loadKernelTools();
      const spec = loadEcosystemSpec();
      return {
        version,
        constitution: kernel.constitution,
        primitives: kernel.primitives,
        policies: kernel.policies,
        mcpCapabilities: kernel.mcp_capabilities,
        bootstrapToolsEnabled: kernel.bootstrap_tools_enabled,
        disabledUntilEvidence: kernel.disabled_until_evidence,
        specVersion: spec.spec_version,
        toolLevels: Object.fromEntries(tools),
      };
    });
  }

  // -------------------------------------------------------------------------
  // Workspaces (layer 3) — the island registry
  // -------------------------------------------------------------------------
  if (request.method === "GET" && url.pathname === "/api/workspaces") {
    return guard(response, () => {
      const workspaces = listWorkspaces();
      return { count: workspaces.length, workspaces: workspaces.map(workspaceSummary) };
    });
  }

  const wsMatch = /^\/api\/workspaces\/([a-z0-9-]+)(\/.*)?$/.exec(url.pathname);
  if (request.method === "GET" && wsMatch) {
    const wsId = wsMatch[1];
    const sub = wsMatch[2] ?? "";
    return guard(response, () => {
      if (actor) assertWorkspaceAccess(actor, wsId);
      const ws = loadWorkspace(wsId);
      if (sub === "" || sub === "/") return { workspace: workspaceSummary(ws) };

      // readiness + tool gate
      if (sub === "/readiness") return { ...workspaceSummary(ws) };

      // evidence (filterable by reviewStatus / relatedDomain)
      if (sub === "/evidence") {
        return {
          count: listEvidence(ws, {
            reviewStatus: url.searchParams.get("reviewStatus") as never,
            relatedDomain: url.searchParams.get("relatedDomain") ?? undefined,
            limit: Number(url.searchParams.get("limit") ?? 100),
          }).length,
          evidence: listEvidence(ws, {
            reviewStatus: url.searchParams.get("reviewStatus") as never,
            relatedDomain: url.searchParams.get("relatedDomain") ?? undefined,
            limit: Number(url.searchParams.get("limit") ?? 100),
          }),
        };
      }

      // feedback queue
      if (sub === "/feedback") {
        return {
          count: listFeedbackQueue(
            {
              qualityStatus: url.searchParams.get("qualityStatus") as never,
              reviewStatus: url.searchParams.get("reviewStatus") as never,
              limit: Number(url.searchParams.get("limit") ?? 50),
            },
            wsStorePaths(ws).intake,
          ).length,
          records: listFeedbackQueue(
            {
              qualityStatus: url.searchParams.get("qualityStatus") as never,
              reviewStatus: url.searchParams.get("reviewStatus") as never,
              limit: Number(url.searchParams.get("limit") ?? 50),
            },
            wsStorePaths(ws).intake,
          ),
        };
      }

      // version proposals
      if (sub === "/proposals") {
        return {
          proposals: listVersionProposals(url.searchParams.get("status") as never, Number(url.searchParams.get("limit") ?? 50), wsStorePaths(ws).proposals),
        };
      }

      // audit events
      if (sub === "/audit") {
        return { events: listAuditEvents(Number(url.searchParams.get("limit") ?? 50), wsStorePaths(ws).audit) };
      }

      // knowledge (the workspace's own source of truth)
      if (sub === "/knowledge") {
        return { knowledge: loadKnowledge(ws.knowledgePathAbs) };
      }

      throw new Error(`unknown_workspace_subpath:${sub}`);
    });
  }

  // -------------------------------------------------------------------------
  // Actions (safe write endpoints the frontend needs)
  // -------------------------------------------------------------------------
  if (request.method === "POST" && url.pathname === "/api/workspaces" && !wsMatch) {
    // create_workspace — the System Igniter
    return guard(response, async () => {
      const body = (await readJson(request)) as { id?: string; displayName?: string; idempotencyKey?: string };
      if (!body.id || !body.displayName) throw new Error("id and displayName are required");
      const { bootstrapWorkspace } = await import("./workspace.js");
      const ws = bootstrapWorkspace({ id: body.id, displayName: body.displayName, idempotencyKey: body.idempotencyKey });
      return { workspace: workspaceSummary(ws) };
    });
  }

  const actionMatch = /^\/api\/workspaces\/([a-z0-9-]+)\/(evidence|capture|assets|domains|owners)(?:\/([a-z0-9-]+))?$/.exec(url.pathname);
  if (request.method === "POST" && actionMatch) {
    const wsId = actionMatch[1];
    const action = actionMatch[2];
    return guard(response, async () => {
      if (actor) assertWorkspaceAccess(actor, wsId);
      const ws = loadWorkspace(wsId);
      const body = (await readJson(request)) as Record<string, unknown>;

      if (action === "capture" || action === "evidence") {
        // capture_field_observation (level 1) / triage_evidence (level 2)
        const { captureEvidence: capture, triageEvidence: triage } = await import("./evidence-store.js");
        const { assertToolEnabled } = await import("./workspace.js");
        if (action === "capture") {
          assertToolEnabled(ws, "capture_field_observation");
          const record = capture(ws, {
            observer: String(body.observer ?? actor?.subject ?? "operator"),
            summary: String(body.summary ?? ""),
            details: body.details ? String(body.details) : undefined,
            related_domain: String(body.relatedDomain ?? "general"),
            source: body.source ? String(body.source) : undefined,
            confidence: typeof body.confidence === "number" ? body.confidence : undefined,
          });
          return { evidence: record };
        }
        // triage
        assertToolEnabled(ws, "triage_evidence");
        const record = triage(ws, String(body.evidenceId ?? ""), body.decision === "rejected" ? "rejected" : "accepted", String(body.by ?? actor?.subject ?? "operator"));
        return { evidence: record };
      }

      if (action === "assets") {
        // create_asset_from_template (level 0)
        const { createAssetFromTemplate: createAsset, saveDraftAsset: saveDraft } = await import("./templates.js");
        const asset = createAssetFromTemplate(String(body.type ?? "playbook"), String(body.title ?? ""));
        const file = saveDraftAsset(asset, ws.dataDirAbs);
        return { asset, draftFile: file };
      }

      if (action === "domains") {
        // define_domain (level 0)
        const { defineDomain } = await import("./workspace.js");
        const updated = defineDomain(ws, {
          domainId: String(body.domainId ?? ""),
          domainName: String(body.domainName ?? ""),
          ownerId: body.ownerId ? String(body.ownerId) : undefined,
        });
        return { workspace: workspaceSummary(updated) };
      }

      if (action === "owners") {
        // assign_owner (level 0)
        const { assignOwner } = await import("./workspace.js");
        const updated = assignOwner(ws, {
          ownerId: String(body.ownerId ?? ""),
          domainId: body.domainId ? String(body.domainId) : undefined,
        });
        return { workspace: workspaceSummary(updated) };
      }

      throw new Error(`unknown_action:${action}`);
    });
  }

  return send(response, 404, { error: `not_found:${url.pathname}` });
});

server.listen(port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`[element-ecosystem] HTTP bridge listening on 0.0.0.0:${port}`);
});

export { server, send, readJson, guard };
