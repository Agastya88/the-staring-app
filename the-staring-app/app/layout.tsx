import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "./components/clientLayout"; // Import Client Component


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Staring Contest",
  description: "Test your staring skills in this spooky challenge!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Wrap children inside Client Component */}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
