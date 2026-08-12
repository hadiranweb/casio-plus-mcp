"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    if (!response.ok) {
      setError("ورود ناموفق بود.");
      return;
    }
    router.push("/home");
    router.refresh();
  }
  return (
    <main>
      <h1>ورود به عنصر پلاس</h1>
      <form onSubmit={submit}>
        <label>
          ایمیل <input name="email" type="email" required />
        </label>
        <label>
          گذرواژه{" "}
          <input name="password" type="password" minLength={12} required />
        </label>
        <button type="submit">ورود</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}
