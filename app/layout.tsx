import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Greenblood",
  description: "Greenblood — a gritty survival sandbox. Chop, craft, build, and survive the wilderness.",
  keywords: ["Greenblood", "survival", "sandbox", "Next.js", "Three.js"],
  authors: [{ name: "Greenblood" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Greenblood",
    description: "A gritty survival sandbox",
    url: "https://chat.z.ai",
    siteName: "Greenblood",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Greenblood",
    description: "A gritty survival sandbox",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
