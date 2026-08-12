"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const response = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: form.get("displayName"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    if (!response.ok) {
      setError("ثبت‌نام ناموفق بود.");
      return;
    }
    router.push("/login");
  }
  return (
    <main>
      <h1>ساخت حساب عنصر پلاس</h1>
      <form onSubmit={submit}>
        <label>
          نام <input name="displayName" required />
        </label>
        <label>
          ایمیل <input name="email" type="email" required />
        </label>
        <label>
          گذرواژه{" "}
          <input name="password" type="password" minLength={12} required />
        </label>
        <button type="submit">ثبت‌نام</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}
