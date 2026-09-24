import Link from "next/link";
import { ArrowLeft, ClipboardList, GraduationCap } from "lucide-react";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { UniversityNoteRequestForm } from "@/components/store/university-note-request-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Request University Notes | IlmAI Store",
  description: "Tell IlmAI which university, program, semester, subject and study resources you need, including MCQs, short questions, long questions, past papers and more.",
  alternates: { canonical: "/store/university-note-request" },
};

export default async function UniversityNoteRequestPage() {
  const { data: { user } } = await (await createSupabaseServerClient()).auth.getUser();
  const initialName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const initialEmail = user?.email ?? "";

  return (
    <main className="store-shell min-h-screen">
      <StoreHeader />
      <div className="store-container py-8 sm:py-12">
        <Link href="/store/ilm-ai-notes" className="section-link"><ArrowLeft size={14} /> Back to IlmAI Notes</Link>
        <section className="mt-6 overflow-hidden rounded-[32px] bg-[#0B1D3A] p-7 text-white sm:p-10">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#D4AF37]"><GraduationCap size={24} /></div>
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-[#D4AF37]">University resource request</p>
              <h1 className="display-font mt-2 text-4xl sm:text-5xl">Tell us exactly what you need.</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#B9C4E0] sm:text-base">University notes are being expanded. Until a subject or resource is available on the store, send the full academic details below. You can request complete notes, MCQs, short questions, long questions, past papers, solved papers, practicals, viva material and more in one request.</p>
            </div>
          </div>
        </section>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#0F766E]/20 bg-[#ECFDF5] px-4 py-3 text-sm leading-6 text-[#14532D]">
          <ClipboardList size={18} className="shrink-0" />
          <span>The more exact your university, course, semester and chapter details are, the easier it is to prepare the right material.</span>
        </div>

        <div className="mt-6">
          <UniversityNoteRequestForm initialName={initialName} initialEmail={initialEmail} />
        </div>
      </div>
      <StoreFooter />
    </main>
  );
}
