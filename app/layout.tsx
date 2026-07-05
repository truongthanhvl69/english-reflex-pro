import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-body" });
const manrope = Manrope({ subsets: ["latin", "vietnamese"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "English Reflex Pro",
  description: "Luyện phản xạ tiếng Anh tự nhiên cho người Việt.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} ${manrope.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
