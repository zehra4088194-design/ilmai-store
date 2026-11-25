import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in | IlmAI Pay" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F1F5F9] px-5 py-12 text-[#0B1D3A]">
      <section className="w-full max-w-md rounded-[2rem] border bg-white p-8 shadow-[0_25px_70px_rgba(16,61,66,.08)] sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0F766E] text-lg font-black text-white">i</span>
          <div><p className="font-black">IlmAI Pay</p><p className="text-xs font-semibold text-[#64748B]">Merchant portal</p></div>
        </div>
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#0F766E]">Welcome back</p>
        <h1 className="display-font mt-2 text-4xl font-black leading-tight">Sign in.</h1>
        <p className="mt-3 text-sm leading-6 text-[#64748B]">Merchant access is created by an IlmAI administrator. There is no public sign-up.</p>
        <Suspense fallback={null}><LoginForm /></Suspense>
      </section>
    </main>
  );
}
