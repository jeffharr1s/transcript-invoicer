import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transcript Invoicer",
  description: "Convert consulting transcripts into billable invoices with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
