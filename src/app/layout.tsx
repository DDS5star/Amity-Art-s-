import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "Amity Arts — Fine Handcrafted Jewellery, India",
    template: "%s | Amity Arts",
  },
  description:
    "Kundan, polki and pearl jewellery handcrafted in India by Amity Arts®. Retail and wholesale.",
  keywords: [
    "jewellery", "imitation jewellery", "fashion jewellery", "artificial jewellery",
    "wholesale jewellery", "bridal jewellery", "kundan", "polki", "bangles",
    "earrings", "necklaces", "India",
  ],
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: "Amity Arts",
    locale: "en_IN",
    url: BASE,
    title: "Amity Arts — Fine Handcrafted Jewellery, India",
    description: "Kundan, polki and pearl jewellery handcrafted in India.",
    images: [{ url: "/brand/logo.png", width: 900, height: 453, alt: "Amity Arts India" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Amity Arts — Fine Handcrafted Jewellery, India",
    description: "Kundan, polki and pearl jewellery handcrafted in India.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${cormorant.variable} ${manrope.variable}`}
    >
      <body className="min-h-[100dvh] flex flex-col">{children}</body>
    </html>
  );
}
