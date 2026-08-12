import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { identityService } from "../../src/lib/identity";
export default async function HomePage() {
  const token = (await cookies()).get("element_plus_session")?.value;
  if (!token) redirect("/login");
  try {
    const session = await identityService().authenticate(token);
    return (
      <main>
        <h1>Mission Control</h1>
        <p>نشست احراز هویت شده برای کاربر {session.userId}</p>
        <p>Founder در Sprint 03 فعال می‌شود.</p>
      </main>
    );
  } catch {
    redirect("/login");
  }
}
