import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "ReviewMyLoad",
  description: "Free review automation powered by payments for home service pros.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
