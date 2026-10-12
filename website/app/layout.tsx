import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "sPanel: Smart PaaS Panel | Self-Hosted Platform as a Service",
  description:
    "sPanel is a lightweight, self-hosted Platform as a Service for deploying and managing applications on your own Linux VPS with Docker-based execution and Go single-binary architecture.",
  keywords: [
    "sPanel",
    "Self-Hosted PaaS",
    "PaaS Linux VPS",
    "Docker Deployment",
    "Next.js PaaS",
    "Coolify Alternative",
    "Vercel Alternative Self-Hosted",
    "Nixpacks",
    "Go Fiber PaaS",
  ],
  authors: [{ name: "sPanel Contributors" }],
  openGraph: {
    title: "sPanel: Smart PaaS Panel",
    description:
      "Deploy and manage applications on your Linux VPS with zero-config Docker builds, database provisioning, and Go single-binary architecture.",
    type: "website",
    url: "https://spanel.dev",
    siteName: "sPanel Documentation & Portal",
  },
  twitter: {
    card: "summary_large_image",
    title: "sPanel: Smart PaaS Panel",
    description: "Self-hosted PaaS for deploying applications on your own Linux VPS.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
