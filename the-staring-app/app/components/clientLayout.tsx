"use client";  // Marks this as a Client Component

import React from "react";
import { Creepster } from "next/font/google";

const creepster = Creepster({ weight: "400", subsets: ["latin"] });

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={creepster.className}>
      <style jsx global>{`
        .creepster {
          font-family: ${creepster.style.fontFamily};
        }
      `}</style>
      {children}
    </div>
  );
}
