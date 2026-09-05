import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#F1F5F9] px-5 py-10 text-[#0B1D3A] sm:py-16">
      <div className="mx-auto max-w-md">
        <div className="rounded-[2rem] border bg-white p-8 shadow-[0_25px_70px_rgba(16,61,66,.08)] sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Account recovery</p>
          <h1 className="display-font mt-3 text-4xl leading-tight text-[#0B1D3A]">Choose a new password.</h1>
          <ResetPasswordForm />
        </div>
      </div>
    </main>
  );
}
