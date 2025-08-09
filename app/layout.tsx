import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Script from "next/script";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl), // 👈 add this
  title: "SeatScape",
  description:
    "SeatScape — pick the best airplane window seat using the sun’s path and scenic views.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "SeatScape",
    description: "Pick the perfect airplane seat for sun and city views.",
    images: ["/og-image.png"], // resolved against metadataBase
    type: "website",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "SeatScape",
    description: "Pick the perfect airplane seat for sun and city views.",
    images: ["/og-image.png"], // resolved against metadataBase
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var stored = localStorage.getItem('theme');
                var prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var dark = stored ? stored === 'dark' : prefers;
                if (dark) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
              } catch (e) {}
            })();
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
