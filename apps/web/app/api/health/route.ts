import { readEnvironment } from "../../../src/lib/env";

export function GET() {
  const environment = readEnvironment();
  return Response.json({
    status: "ok",
    service: "element-plus-web",
    runtime: environment.ELEMENT_PLUS_RUNTIME_MODE,
  });
}
