import Link from "next/link";
export default function HomePage() {
  return (
    <main>
      <h1>عنصر پلاس</h1>
      <p>پایهٔ معماری، هویت و workspace آماده است.</p>
      <p>
        <Link href="/login">ورود</Link> یا{" "}
        <Link href="/register">ساخت حساب</Link>
      </p>
    </main>
  );
}
