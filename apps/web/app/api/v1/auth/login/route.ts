import { AuthorizationError } from "@element-plus/application";
import { identityService } from "../../../../../src/lib/identity";
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const result = await identityService().login({
      email: body.email ?? "",
      password: body.password ?? "",
    });
    return new Response(
      JSON.stringify({
        user: {
          id: result.user.id,
          email: result.user.email,
          displayName: result.user.displayName,
        },
        workspace: result.workspace,
      }),
      {
        headers: {
          "content-type": "application/json",
          "set-cookie": `element_plus_session=${result.token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`,
        },
      },
    );
  } catch (error) {
    return Response.json(
      { error: "invalid_credentials" },
      { status: error instanceof AuthorizationError ? 401 : 400 },
    );
  }
}
