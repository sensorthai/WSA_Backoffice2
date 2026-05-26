import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "WSA office",
  description: "Internal management system",
};

import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/contexts/I18nContext";
import { cookies } from "next/headers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "th") as 'th' | 'en';

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "antialiased font-sans transition-colors duration-300"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <I18nProvider initialLocale={locale}>
            <Providers>
              {children}
            </Providers>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
