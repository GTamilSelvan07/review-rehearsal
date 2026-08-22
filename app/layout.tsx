import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Review Rehearsal — CHI 2027 mock review",
  description:
    "Upload a CHI submission and rehearse the real CHI 2027 review pipeline: desk-reject checks, a reference-authenticity audit, the ADR rubric, five expert reviews, and a strengthening guide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
