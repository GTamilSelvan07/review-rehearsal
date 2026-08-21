import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Review Rehearsal — CHI 2027 mock review",
  description:
    "Upload a CHI submission and rehearse the real CHI 2027 review pipeline: desk-reject checks, a reference-authenticity audit, the ADR rubric, four expert reviews, and a strengthening guide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..600&family=Source+Sans+3:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
