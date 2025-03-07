"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

export default function Home() {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    router.push("/game")
  }

  return (
    <main
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative h-screen w-full overflow-hidden cursor-pointer"
    >
      <video autoPlay loop muted playsInline className="absolute top-0 left-0 min-w-full min-h-full object-cover z-0">
        <source
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/192731-893446840-9a6nymGDa2UW8agAQoM4SHIGxLhimy.mp4"
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="creepster text-6xl mb-8 text-shadow"
        >
          Jumpscare Roulette
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0.6 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-light tracking-widest uppercase"
        >
          click to begin
        </motion.p>
      </div>
    </main>
  )
}

