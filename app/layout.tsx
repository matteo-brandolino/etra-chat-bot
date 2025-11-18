import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PWAInstaller } from "@/components/pwa-installer";
import { StructuredData } from "@/components/structured-data";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://etra-chat-bot.vercel.app"),
  title: "Guida ETRA Rifiuti - Assistente Raccolta Differenziata Veneto",
  description: "Assistente AI non ufficiale per la raccolta differenziata ETRA. Trova il calendario 2025, la tua zona e cosa buttare oggi in oltre 80 comuni del Veneto tra Bassano del Grappa, Asiago e Cittadella.",
  keywords: [
    "ETRA",
    "raccolta differenziata",
    "Veneto",
    "Bassano del Grappa",
    "Asiago",
    "calendario rifiuti",
    "zone raccolta",
    "chatbot",
    "AI assistant",
  ],
  authors: [{ name: "ETRA Assistant" }],
  applicationName: "Guida ETRA Rifiuti",
  generator: "Next.js",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Guida ETRA",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: "https://etra-chat-bot.vercel.app",
    title: "Guida ETRA Rifiuti - Assistente Raccolta Differenziata Veneto",
    description: "Assistente AI non ufficiale per la raccolta differenziata ETRA. Trova il calendario 2025, la tua zona e cosa buttare oggi in oltre 80 comuni del Veneto.",
    siteName: "Guida ETRA Rifiuti",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "ETRA Assistant Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Guida ETRA Rifiuti - Assistente Raccolta Differenziata Veneto",
    description: "Assistente AI non ufficiale per la raccolta differenziata ETRA in Veneto",
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

const LIGHT_THEME_COLOR = "hsl(86deg 30% 98%)";
const DARK_THEME_COLOR = "hsl(153deg 20% 12%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geist.variable} ${geistMono.variable}`}
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      lang="it"
      suppressHydrationWarning
    >
      <head>
        <StructuredData />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <PWAInstaller />
          <Toaster position="top-center" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
