import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const instrumentSerif = localFont({
  src: [
    { path: "../fonts/InstrumentSerif-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/InstrumentSerif-Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-serif",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#07070c",
};

export const metadata: Metadata = {
  title: "Cinebula",
  description: "Explore your mood. Discover your next binge.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cinebula",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} h-full`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator){navigator.serviceWorker.getRegistrations().then(r=>r.forEach(reg=>reg.unregister()))}`,
          }}
        />
      </head>
      <body className="h-full overflow-hidden bg-[#07070c] text-[#f4ebd9]">
        {children}
      </body>
    </html>
  );
}
