import { identityService, sessionToken } from "../../../../../src/lib/identity";
export async function POST(request: Request) {
  try {
    const token = sessionToken(request);
    if (!token)
      return Response.json({ error: "unauthorized" }, { status: 401 });
    await identityService().logout(token);
    return new Response(null, {
      status: 204,
      headers: {
        "set-cookie":
          "element_plus_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
      },
    });
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
}
