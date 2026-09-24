import Link from "next/link";
import { ClipboardList, Mail, Phone } from "lucide-react";
import { UniversityNoteRequestService, type UniversityNoteRequest } from "@/services/UniversityNoteRequestService";
import { UNIVERSITY_NOTE_RESOURCE_LABELS } from "@/constants/university-note-request";
import { UniversityNoteRequestActions } from "@/components/admin/university-note-request-actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

function statusClass(status: string) {
  if (status === "fulfilled") return "bg-[#DCFCE7] text-[#166534]";
  if (status === "in_progress") return "bg-[#DBEAFE] text-[#1D4ED8]";
  if (status === "cancelled") return "bg-[#FEE2E2] text-[#B91C1C]";
  return "bg-[#FEF3C7] text-[#92400E]";
}

export default async function AdminUniversityNoteRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedStatus = ["pending", "in_progress", "fulfilled", "cancelled"].includes(params.status ?? "") ? params.status as UniversityNoteRequest["status"] : undefined;
  const requests = await UniversityNoteRequestService.adminList(requestedStatus);

  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">University content pipeline</p>
          <h1 className="display-font mt-2 text-5xl">Note Requests</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748B]">Students can tell you exactly which university resources they need. Review the complete academic details here, then prepare/send the material and mark the request accordingly.</p>
        </div>
        <Link href="/admin/ilm-ai-notes" className="rounded-full border px-5 py-3 text-sm font-bold text-[#0B1D3A]">IlmAI Notes</Link>
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        {[["", "All"], ["pending", "Pending"], ["in_progress", "In progress"], ["fulfilled", "Fulfilled"], ["cancelled", "Cancelled"]].map(([value, label]) => <Link key={value} href={value ? `/admin/university-note-requests?status=${value}` : "/admin/university-note-requests"} className={`rounded-full border px-4 py-2 text-xs font-black ${(requestedStatus ?? "") === value ? "border-[#0B1D3A] bg-[#0B1D3A] text-white" : "border-[var(--line)] bg-white text-[#0B1D3A]"}`}>{label}</Link>)} 
      </div>

      <div className="mt-7 grid gap-5">
        {requests.map((request) => (
          <article key={request.id} className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#0B1D3A] px-3 py-1 text-[11px] font-black text-white">{request.requestNumber}</span>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${statusClass(request.status)}`}>{request.status.replace("_", " ")}</span>
                </div>
                <h2 className="mt-3 text-xl font-black text-[#0B1D3A]">{request.subject}</h2>
                <p className="mt-1 text-sm text-[#64748B]">{request.university} · {request.program} · {request.yearOrSemester}</p>
              </div>
              <p className="text-xs font-semibold text-[#94A3B8]">{new Date(request.createdAt).toLocaleString("en-PK")}</p>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl bg-[#F8FAFC] p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Student" value={request.studentName} />
              <Info label="Email" value={request.email} icon={<Mail size={14} />} />
              <Info label="Phone" value={request.phone ?? "—"} icon={<Phone size={14} />} />
              <Info label="Campus" value={request.campus ?? "—"} />
              <Info label="City" value={request.city ?? "—"} />
              <Info label="Department" value={request.department ?? "—"} />
              <Info label="Degree level" value={request.degreeLevel ?? "—"} />
              <Info label="Course code" value={request.courseCode ?? "—"} />
              <Info label="Exam/session" value={request.examSession ?? "—"} />
              <Info label="Language" value={request.language ?? "—"} />
              <Info label="Format" value={request.preferredFormat ?? "—"} />
              <Info label="Needed by" value={request.neededBy ?? "—"} />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail title="Requested resources" body={request.resourceTypes.map((key) => UNIVERSITY_NOTE_RESOURCE_LABELS[key] ?? key).join(" · ")} />
              <Detail title="Chapters / topics" body={request.chaptersTopics ?? "No chapter or topic detail provided."} />
            </div>
            {request.additionalDetails && <div className="mt-4"><Detail title="Additional details" body={request.additionalDetails} /></div>}
            <UniversityNoteRequestActions id={request.id} initialStatus={request.status} initialNote={request.adminNote} />
          </article>
        ))}
        {!requests.length && <div className="rounded-3xl border border-dashed bg-white p-12 text-center"><ClipboardList size={34} className="mx-auto text-[#0F766E]" /><h2 className="mt-4 text-xl font-black text-[#0B1D3A]">No requests here.</h2><p className="mt-2 text-sm text-[#64748B]">New university note requests will appear automatically.</p></div>}
      </div>
    </main>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#94A3B8]">{label}</p><p className="mt-1 flex items-center gap-1.5 break-words font-semibold text-[#0B1D3A]">{icon}{value}</p></div>;
}

function Detail({ title, body }: { title: string; body: string }) {
  return <div className="rounded-2xl border border-[var(--line)] p-4"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#94A3B8]">{title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#475569]">{body}</p></div>;
}
