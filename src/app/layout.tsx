import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Amiri, Cairo, Tajawal } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/components/LanguageProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "الإيوان الرقمي - أول ذكاء اصطناعي عراقي",
  description: "الإيوان الرقمي - المساعد الذكي للعلوم الإسلامية. أسئلة، محاورات، اختبارات ومزيد.",
  icons: {
    icon: "https://www.image2url.com/r2/default/images/1777330045986-560b3c15-7c7b-4c2f-af23-6499ce631950.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const ALL_ARABIC_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;700&family=IBM+Plex+Serif+Arabic:wght@400;700&family=Katibeh&family=Lalezar&family=Lateef&family=Markazi+Text:wght@400;700&family=Mirza:wght@400;700&family=Noto+Kufi+Arabic:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&family=Noto+Serif+Arabic:wght@400;700&family=Reem+Kufi:wght@400;700&family=Scheherazade+New:wght@400;700&display=swap';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={ALL_ARABIC_FONTS_URL} rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${amiri.variable} ${cairo.variable} ${tajawal.variable} antialiased bg-background text-foreground font-[family-name:var(--font-geist-sans)]`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
