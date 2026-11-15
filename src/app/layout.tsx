import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Fornexo", template: "%s | Fornexo" },
  description: "Plataforma de dropshipping para fornecedores e revendedores de marketplace.",
  applicationName: "Fornexo",
  appleWebApp: { capable: true, title: "Fornexo", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans min-h-dvh">
        {children}
        <Toaster position="top-center" richColors closeButton toastOptions={{ className: "font-sans" }} />
      </body>
    </html>
  );
}
