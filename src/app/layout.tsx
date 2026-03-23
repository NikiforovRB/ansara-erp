import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const gilroy = localFont({
  src: "./fonts/Gilroy-Medium.ttf",
  variable: "--font-gilroy",
  display: "swap",
  weight: "500",
});

const gilroyBold = localFont({
  src: "./fonts/Gilroy-Bold.ttf",
  variable: "--font-gilroy-bold",
  display: "swap",
  weight: "700",
});

export const metadata: Metadata = {
  title: "ANSARA - Личный кабинет",
  description: "Управление проектами и личным кабинетом заказчика",
  manifest: "/manifest.webmanifest",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${gilroy.variable} ${gilroyBold.variable} ${gilroy.className}`}
    >
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
