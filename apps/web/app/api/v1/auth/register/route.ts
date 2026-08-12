import { identityService } from "../../../../../src/lib/identity";
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      displayName?: string;
      password?: string;
    };
    const result = await identityService().register({
      email: body.email ?? "",
      displayName: body.displayName ?? "",
      password: body.password ?? "",
    });
    return Response.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          displayName: result.user.displayName,
        },
        workspace: result.workspace,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "registration_failed" },
      { status: 400 },
    );
  }
}
