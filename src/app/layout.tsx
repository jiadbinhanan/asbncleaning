import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://btmcleaning.vercel.app/'),
  title: "BTM Cleaning and Technical Services Co.",
  description: "Top-rated professional cleaning services in Dubai. We offer residential and commercial cleaning solutions. Book your service today!",
  // 🚨 NEW: PWA theme color
  themeColor: "#2563eb",
  openGraph: {
    title: "BTM Cleaning and Technical Services Co.",
    description: "Top-rated professional cleaning services in Dubai.",
    images: [
      {
        url: "/og_btm.jpg",
        width: 1200,
        height: 630,
        alt: "BTM Cleaning Services Banner",
      },
    ],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* 🚨 NEW: PWA manifest link */}
        <link rel="manifest" href="/manifest.json" />
        {/* 🚨 NEW: iOS PWA support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BTM Driver" />
        <link rel="apple-touch-icon" href="/logo_btm-192.png" />
      </head>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />

        {/* 🚨 NEW: Service Worker registration */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) {
                  console.log('[BTM] SW registered, scope:', reg.scope);
                })
                .catch(function(err) {
                  console.error('[BTM] SW registration failed:', err);
                });
            });
          }
        `}} />
      </body>
    </html>
  );
}