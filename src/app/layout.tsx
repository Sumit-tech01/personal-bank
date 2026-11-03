import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import AppRoot from "@/components/AppRoot";

const geist = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://personalbank.app"),
  title: "Personal Bank — Your Family. Your Farm. Your Finances.",
  description:
    "Your Family. Your Farm. Your Finances. Track household spending, farming costs, labour, vehicles, and income in one place.",
  applicationName: "Personal Bank",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Personal Bank",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Personal Bank — Your Family. Your Farm. Your Finances.",
    description:
      "Your Family. Your Farm. Your Finances. Track household spending, farming costs, labour, vehicles, and income in one place.",
    siteName: "Personal Bank",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Personal Bank Icon",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Personal Bank",
    description: "Your Family. Your Farm. Your Finances.",
    images: ["/icon-512.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2F7D4F",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
      <body className={`${geist.className} bg-canvas text-ink antialiased`}>
        <AppProvider>
          <AppRoot>{children}</AppRoot>
        </AppProvider>
      </body>
    </html>
  );
}
