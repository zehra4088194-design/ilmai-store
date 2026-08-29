import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IlmAI Store",
  description: "The official store of the IlmAI education platform.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_STORE_URL ?? "https://ilmai.store"),
  openGraph: { title: "IlmAI Store", description: "Study tools with a little more thought in them.", type: "website" },
};

// Root layout is intentionally minimal — Codex owns the final visual
// identity (fonts, header/footer, theme provider). See CLAUDE_CONTEXT.md §15.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
