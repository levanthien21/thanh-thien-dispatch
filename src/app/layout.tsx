import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppToaster from "@/components/AppToaster";

export const metadata: Metadata = {
  title: "Nhà xe Thanh Thiện - Dispatch System",
  description: "Phần mềm trợ lý tổng đài nhà xe Thanh Thiện",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppToaster />
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
