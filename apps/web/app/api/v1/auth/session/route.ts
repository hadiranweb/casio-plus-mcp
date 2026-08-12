import { identityService, sessionToken } from "../../../../../src/lib/identity";
export async function GET(request: Request) {
  try {
    const token = sessionToken(request);
    if (!token) throw new Error();
    const session = await identityService().authenticate(token);
    return Response.json({
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
      },
    });
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
}
