import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { getLocale } from "@/lib/i18n/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Innopark Attendance",
  description: "Gestion des présences et RMA - Innopark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();

  return (
    <html lang={locale}>
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
