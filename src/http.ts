import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { getPlaybook, knowledgeSummary, loadKnowledge, searchPlaybooks } from "./knowledge-store.js";
import { listFeedbackQueue, submitFeedback } from "./intake-store.js";
import { listAuditEvents } from "./audit-store.js";
import { listVersionProposals } from "./proposal-store.js";
import { feedbackInputSchema, validateFeedback } from "./quality.js";

const knowledge = loadKnowledge(process.env.CASIO_KNOWLEDGE_PATH);
const port = Number(process.env.CASIO_HTTP_PORT ?? 4110);

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "http://127.0.0.1:4173",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body, null, 2));
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

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") return send(response, 204, {});
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      return send(response, 200, { ok: true, service: "casio-plus-core", mode: "local-http-bridge", version: knowledge.meta.نسخه });
    }
    if (request.method === "GET" && url.pathname === "/api/knowledge") return send(response, 200, { کاسیو: knowledge });
    if (request.method === "GET" && url.pathname === "/api/summary") return send(response, 200, knowledgeSummary(knowledge));
    if (request.method === "GET" && url.pathname === "/api/architecture") return send(response, 200, knowledge.معماری ?? {});
    if (request.method === "GET" && url.pathname === "/api/learning") return send(response, 200, knowledge.آموزش ?? {});

    if (request.method === "GET" && url.pathname === "/api/playbooks") {
      const playbooks = searchPlaybooks(knowledge, {
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
      const playbook = getPlaybook(knowledge, Number(playbookMatch[1]));
      return playbook ? send(response, 200, playbook) : send(response, 404, { error: "playbook_not_found" });
    }

    if (request.method === "GET" && url.pathname === "/api/review-queue") {
      return send(response, 200, {
        records: listFeedbackQueue({
          qualityStatus: url.searchParams.get("qualityStatus") as "raw" | "quarantined" | "validated" | "rejected" | undefined,
          reviewStatus: url.searchParams.get("reviewStatus") as "pending_review" | "approved" | "rejected" | undefined,
          limit: Number(url.searchParams.get("limit") ?? 50),
        }),
      });
    }
    if (request.method === "GET" && url.pathname === "/api/version-proposals") {
      return send(response, 200, { proposals: listVersionProposals(url.searchParams.get("status") as "pending_human_merge" | "merged" | "discarded" | undefined) });
    }
    if (request.method === "GET" && url.pathname === "/api/audit-events") {
      return send(response, 200, { events: listAuditEvents(Number(url.searchParams.get("limit") ?? 50)) });
    }

    if (request.method === "POST" && url.pathname === "/api/feedback-intake") {
      const input = feedbackInputSchema.parse(await readJson(request));
      const report = validateFeedback(input, knowledge);
      const result = submitFeedback(input, report);
      return send(response, 201, { record: result.record, duplicateOf: result.duplicateOf ?? null });
    }

    return send(response, 404, { error: "not_found", path: url.pathname });
  } catch (error) {
    return send(response, 400, { error: error instanceof Error ? error.message : "bad_request" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.error(`CasioPlus HTTP bridge listening on http://127.0.0.1:${port}`);
});
