import Link from "next/link";
import { Suspense } from "react";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#F1F5F9] px-5 py-14 text-[#0B1D3A]">
      <div className="mx-auto max-w-md">
        <Link href="/store" className="text-sm font-bold text-[#2563EB]">
          ← Back to store
        </Link>
        <div className="mt-8 rounded-[2rem] border bg-white p-8 shadow-[0_25px_70px_rgba(16,61,66,.08)] sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#2563EB]">Join the shelf</p>
          <h1 className="display-font mt-2 text-4xl leading-tight">Create your account.</h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            One account for every order, download and note you keep with IlmAI.
          </p>
          <Suspense fallback={null}>
            <SignupForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
