"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";
import { UNIVERSITY_NOTE_RESOURCE_TYPES } from "@/constants/university-note-request";

type Props = { initialName?: string; initialEmail?: string };

export function UniversityNoteRequestForm({ initialName = "", initialEmail = "" }: Props) {
  const [studentName, setStudentName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [campus, setCampus] = useState("");
  const [city, setCity] = useState("");
  const [program, setProgram] = useState("");
  const [department, setDepartment] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("");
  const [yearOrSemester, setYearOrSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [examSession, setExamSession] = useState("");
  const [language, setLanguage] = useState("");
  const [resourceTypes, setResourceTypes] = useState<string[]>(["complete_notes"]);
  const [chaptersTopics, setChaptersTopics] = useState("");
  const [preferredFormat, setPreferredFormat] = useState("digital");
  const [neededBy, setNeededBy] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestNumber, setRequestNumber] = useState<string | null>(null);

  const selectedLabels = useMemo(() => UNIVERSITY_NOTE_RESOURCE_TYPES.filter(([key]) => resourceTypes.includes(key)).map(([, label]) => label), [resourceTypes]);

  function toggleResource(key: string) {
    setResourceTypes((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resourceTypes.length) { setError("Select at least one type of resource you need."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/university-note-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName, email, phone, university, campus, city, program, department, degreeLevel,
          yearOrSemester, subject, courseCode, examSession, language, resourceTypes, chaptersTopics,
          preferredFormat, neededBy, additionalDetails,
        }),
      });
      const data = await response.json() as { requestNumber?: string; error?: string };
      if (!response.ok || !data.requestNumber) throw new Error(data.error ?? "Request could not be submitted.");
      setRequestNumber(data.requestNumber);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (requestNumber) {
    return (
      <div className="rounded-[30px] border border-[#0F766E]/20 bg-white p-7 text-center shadow-[0_20px_70px_rgba(11,29,58,.06)] sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#DCFCE7] text-[#0F766E]"><CheckCircle2 size={30} /></div>
        <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-[#0F766E]">Request received</p>
        <h2 className="mt-2 text-3xl font-black text-[#0B1D3A]">We have your university note request.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#64748B]">Keep this request number for reference. The request has been sent to the IlmAI Store team with the university, subject and resource details you provided.</p>
        <div className="mx-auto mt-6 inline-flex rounded-full bg-[#F1F5F9] px-5 py-3 text-sm font-black text-[#0B1D3A]">Request {requestNumber}</div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/store/ilm-ai-notes" className="gold-btn min-h-11 px-5">Back to notes <ArrowRight size={15} /></Link>
          <Link href="/store" className="secondary-cta">Continue shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[30px] border border-[var(--border)] bg-white p-6 shadow-[0_20px_70px_rgba(11,29,58,.06)] sm:p-9">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Student name" value={studentName} onChange={setStudentName} required placeholder="Your full name" />
        <Field label="Email" type="email" value={email} onChange={setEmail} required placeholder="you@example.com" />
        <Field label="WhatsApp / phone" value={phone} onChange={setPhone} placeholder="03xx xxxxxxx" />
        <Field label="University" value={university} onChange={setUniversity} required placeholder="University name" />
        <Field label="Campus" value={campus} onChange={setCampus} placeholder="Main campus / city campus" />
        <Field label="City" value={city} onChange={setCity} placeholder="e.g. Lahore" />
        <Field label="Program / degree" value={program} onChange={setProgram} required placeholder="e.g. Pharm-D, BSCS, MBBS" />
        <Field label="Department" value={department} onChange={setDepartment} placeholder="e.g. Pharmacy" />
        <Field label="Degree level" value={degreeLevel} onChange={setDegreeLevel} placeholder="Undergraduate / Postgraduate / diploma" />
        <Field label="Year / semester" value={yearOrSemester} onChange={setYearOrSemester} required placeholder="e.g. 3rd year / 5th semester" />
        <Field label="Subject(s)" value={subject} onChange={setSubject} required placeholder="Exact subject name" />
        <Field label="Course code" value={courseCode} onChange={setCourseCode} placeholder="e.g. PHAR-301" />
        <Field label="Exam / session" value={examSession} onChange={setExamSession} placeholder="e.g. Midterm Fall 2026" />
        <Field label="Language" value={language} onChange={setLanguage} placeholder="English / Urdu / bilingual" />
        <label className="text-sm font-bold text-[#0B1D3A]">Preferred format<select value={preferredFormat} onChange={(e) => setPreferredFormat(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-normal outline-none focus:border-[#0F766E]"><option value="digital">Digital</option><option value="printed">Printed</option><option value="both">Both</option><option value="not_sure">Not sure</option></select></label>
        <label className="text-sm font-bold text-[#0B1D3A]">Needed by <span className="font-normal text-[#64748B]">(optional)</span><input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-normal outline-none focus:border-[#0F766E]" /></label>
      </div>

      <div className="mt-7">
        <p className="text-sm font-black text-[#0B1D3A]">What do you need? <span className="font-normal text-[#64748B]">Select all that apply.</span></p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {UNIVERSITY_NOTE_RESOURCE_TYPES.map(([key, label]) => <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition ${resourceTypes.includes(key) ? "border-[#0F766E] bg-[#ECFDF5] text-[#0B1D3A]" : "border-[var(--line)] bg-white"}`}><input type="checkbox" checked={resourceTypes.includes(key)} onChange={() => toggleResource(key)} className="h-4 w-4 accent-[#0F766E]" />{label}</label>)} 
        </div>
        <p className="mt-3 text-xs text-[#64748B]">{selectedLabels.length ? selectedLabels.join(" · ") : "Nothing selected yet."}</p>
      </div>

      <label className="mt-7 block text-sm font-bold text-[#0B1D3A]">Chapters / topics / exact paper details
        <textarea value={chaptersTopics} onChange={(e) => setChaptersTopics(e.target.value)} rows={5} placeholder="Chapters, units, modules, specific past-paper years, teacher requirements, or exact topics you want covered." className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 font-normal leading-6 outline-none focus:border-[#0F766E]" />
      </label>
      <label className="mt-5 block text-sm font-bold text-[#0B1D3A]">Anything else we should know?
        <textarea value={additionalDetails} onChange={(e) => setAdditionalDetails(e.target.value)} rows={4} placeholder="Add any special requirement, syllabus, board/university pattern, teacher instructions, or other detail." className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 font-normal leading-6 outline-none focus:border-[#0F766E]" />
      </label>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={submitting} className="gold-btn min-h-12 px-6 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <><Loader2 size={16} className="animate-spin" /> Sending request…</> : <><Send size={16} /> Send university note request</>}</button>
        <p className="max-w-md text-xs leading-5 text-[#64748B]">Your request is for resources that are not currently available. Once reviewed, the team can prepare or send the requested material.</p>
      </div>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
    </form>
  );
}

function Field({ label, value, onChange, required = false, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return <label className="text-sm font-bold text-[#0B1D3A]">{label}{required ? " *" : ""}<input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-normal outline-none focus:border-[#0F766E]" /></label>;
}
