import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f3f6f1] px-5 py-14 text-[#103d42]">
      <div className="mx-auto max-w-md">
        <Link href="/store" className="text-sm font-bold text-[#14777a]">
          ← Back to store
        </Link>
        <div className="mt-8 rounded-[2rem] border bg-white p-8 shadow-[0_25px_70px_rgba(16,61,66,.08)] sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Welcome back</p>
          <h1 className="display-font mt-2 text-4xl leading-tight">Sign in to IlmAI.</h1>
          <p className="mt-3 text-sm leading-6 text-[#6b7f82]">
            Pick up your orders, downloads and everything on your shelf.
          </p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
