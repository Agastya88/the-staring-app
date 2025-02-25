import type React from "react"
import type { Metadata } from "next"
import { Inter, Creepster } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })
const creepster = Creepster({ weight: "400", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "The Staring Contest",
  description: "Test your staring skills in this spooky challenge!",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <style jsx global>{`
          .creepster {
            font-family: ${creepster.style.fontFamily};
          }
        `}</style>
        {children}
      </body>
    </html>
  )
}

