import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "BTM Cleaning and Technical Services Co.",
  description: "Top-rated professional cleaning services in Dubai. We offer residential and commercial cleaning solutions. Book your service today!",
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
      <body>{children}</body>
    </html>
  );
}
