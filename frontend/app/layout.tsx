import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gallstone Risk Study",
  description:
    "Leakage-aware machine learning evaluation for gallstone disease risk prediction from clinical and laboratory data.",
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: "#080b13",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ backgroundColor: "#080b13" }}
    >
      <body className="min-h-full flex flex-col bg-grid" style={{ backgroundColor: "var(--background)" }}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          Exploratory research tool &mdash; not validated for clinical deployment.
        </footer>
        <Toaster richColors position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
