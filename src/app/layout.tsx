import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PPanel — Proxmox Control Panel",
  description: "Admin interface for your Proxmox VE cluster",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-bg text-text">{children}</body>
    </html>
  );
}
