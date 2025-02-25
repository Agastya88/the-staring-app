"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Creepster } from "next/font/google"
import { Space_Mono } from "next/font/google"
import { motion, AnimatePresence } from "framer-motion"

const creepster = Creepster({ weight: "400", subsets: ["latin"] })
const spaceMono = Space_Mono({ weight: "400", subsets: ["latin"] })

export default function Game() {
  const [gameState, setGameState] = useState("playing")
  const [currentLevel, setCurrentLevel] = useState(1)
  const [volume, setVolume] = useState(0.5) // 0 to 1
  const [brightness, setBrightness] = useState(1) // 0.2 to 1.2
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (gameState === "playing") {
      const timer = setTimeout(() => {
        setGameState("completed")
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [gameState])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
    }
  }, [volume])

  const handleLookedAway = () => {
    setGameState("lost")
  }

  const handleNextLevel = () => {
    setCurrentLevel((prevLevel) => prevLevel + 1)
    setGameState("playing")
  }

  const handleVolumeDial = (e: React.MouseEvent<HTMLDivElement>) => {
    const dial = e.currentTarget
    const rect = dial.getBoundingClientRect()
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }

    const handleMove = (moveEvent: MouseEvent) => {
      const angle = Math.atan2(moveEvent.clientY - center.y, moveEvent.clientX - center.x)
      const degrees = angle * (180 / Math.PI) + 90
      const normalizedDegrees = degrees < 0 ? degrees + 360 : degrees
      const volume = Math.max(0, Math.min(1, normalizedDegrees / 360))
      setVolume(volume)
      dial.style.transform = `rotate(${normalizedDegrees}deg)`
    }

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove)
      document.removeEventListener("mouseup", handleUp)
    }

    document.addEventListener("mousemove", handleMove)
    document.addEventListener("mouseup", handleUp)
  }

  const handleBrightnessDial = (e: React.MouseEvent<HTMLDivElement>) => {
    const dial = e.currentTarget
    const rect = dial.getBoundingClientRect()
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }

    const handleMove = (moveEvent: MouseEvent) => {
      const angle = Math.atan2(moveEvent.clientY - center.y, moveEvent.clientX - center.x)
      const degrees = angle * (180 / Math.PI) + 90
      const normalizedDegrees = degrees < 0 ? degrees + 360 : degrees
      const brightness = Math.max(0.2, Math.min(1.2, 0.2 + normalizedDegrees / 360))
      setBrightness(brightness)
      dial.style.transform = `rotate(${normalizedDegrees}deg)`
    }

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove)
      document.removeEventListener("mouseup", handleUp)
    }

    document.addEventListener("mousemove", handleMove)
    document.addEventListener("mouseup", handleUp)
  }

  return (
    <main className="relative flex items-center justify-center min-h-screen bg-gray-900 p-4">
      {/* Branding */}
      <motion.h1
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`${creepster.className} absolute top-6 left-7 text-4xl text-white opacity-90 text-shadow z-10`}
      >
        The Staring Contest
      </motion.h1>

      <div className="relative max-w-[1200px] w-full">
        {/* TV Unit */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="relative bg-gray-900 p-8 rounded-lg shadow-2xl tv-crt"
          style={{
            filter: `brightness(${brightness})`,
          }}
        >
          <div className="flex gap-8">
            {/* TV Screen Area */}
            <div className="relative flex-1">
              {/* TV Frame */}
              <div className="relative bg-black p-6 rounded-lg border-12 tv-frame">
                {/* Screen Content */}
                <div className="relative aspect-[4/3] overflow-hidden rounded tv-screen">
                  <div className="absolute inset-0 bg-gradient-to-br from-black/30 to-transparent pointer-events-none z-10"></div>
                  <div className="absolute inset-0 tv-overlay pointer-events-none z-20"></div>
                  <AnimatePresence mode="wait">
                    {gameState === "playing" && (
                      <motion.div
                        key="playing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full"
                      >
                        <video
                          ref={videoRef}
                          autoPlay
                          muted={volume === 0}
                          playsInline
                          className="w-full h-full object-cover"
                        >
                          <source src="/placeholder.mp4" type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      </motion.div>
                    )}
                    {gameState === "completed" && (
                      <motion.div
                        key="completed"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{
                          scale: [0.8, 1.2, 1],
                          opacity: 1,
                        }}
                        transition={{ duration: 0.5 }}
                        className="w-full h-full flex items-center justify-center bg-green-500 text-white"
                      >
                        <span className={`${creepster.className} text-4xl animate-pulse`}>
                          Level {currentLevel} Completed!
                        </span>
                      </motion.div>
                    )}
                    {gameState === "lost" && (
                      <motion.div
                        key="lost"
                        initial={{ opacity: 0, rotateX: 90 }}
                        animate={{
                          opacity: 1,
                          rotateX: 0,
                          transition: { type: "spring", duration: 0.7 },
                        }}
                        className="w-full h-full flex items-center justify-center bg-red-500 text-white"
                      >
                        <span className={`${creepster.className} text-4xl animate-bounce`}>You Lose!</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* TV Controls Panel */}
            <div className="w-64 flex flex-col gap-6 p-6 bg-gray-800 rounded-r-lg tv-controls">
              {/* Level Display and Game Controls */}
              <div className="flex-1 space-y-6">
                <motion.div
                  className="flex flex-col items-center gap-2"
                  animate={{ scale: gameState === "completed" ? [1, 1.1, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-20 h-20 rounded-full bg-black border-4 border-gray-700 flex items-center justify-center retro-screen">
                    <span className={`${spaceMono.className} text-amber-500 text-2xl font-bold`}>
                      {currentLevel.toString().padStart(2, "0")}
                    </span>
                  </div>
                  <span className={`${spaceMono.className} text-amber-500 text-xs tracking-[0.2em] uppercase`}>
                    Level
                  </span>
                </motion.div>

                <div className="space-y-4">
                  <AnimatePresence mode="wait">
                    {gameState === "playing" && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        onClick={handleLookedAway}
                        className={`${spaceMono.className} w-full bg-red-900 hover:bg-red-800 text-red-200 text-sm py-3 px-4 rounded border-2 border-red-950 retro-button`}
                      >
                        LOOKED AWAY
                      </motion.button>
                    )}
                    {gameState === "completed" && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        onClick={handleNextLevel}
                        className={`${spaceMono.className} w-full bg-green-900 hover:bg-green-800 text-green-200 text-sm py-3 px-4 rounded border-2 border-green-950 retro-button group relative overflow-hidden`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="animate-pulse">►</span>
                          CLICK FOR NEXT LEVEL
                          <span className="animate-pulse">◄</span>
                        </span>
                        <div className="absolute inset-0 bg-green-400/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200"></div>
                      </motion.button>
                    )}
                    {gameState === "lost" && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <Link
                          href="/"
                          className={`${spaceMono.className} block w-full text-center bg-blue-900 hover:bg-blue-800 text-blue-200 text-sm py-3 px-4 rounded border-2 border-blue-950 retro-button`}
                        >
                          TRY AGAIN
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Control Dials */}
              <div className="grid grid-cols-2 gap-4">
                {/* Volume Dial */}
                <div className="relative">
                  <div className="dial-ticks"></div>
                  <div className="flex flex-col items-center">
                    <div
                      className="w-16 h-16 rounded-full bg-gray-900 border-4 border-gray-700 relative dial cursor-grab active:cursor-grabbing"
                      style={{ transform: `rotate(${volume * 360}deg)` }}
                      onMouseDown={handleVolumeDial}
                    >
                      <div className="absolute w-1 h-8 bg-amber-500 left-1/2 -translate-x-1/2 origin-bottom"></div>
                    </div>
                    <span className={`${spaceMono.className} text-amber-500 text-xs mt-2 tracking-[0.2em] uppercase`}>
                      Volume
                    </span>
                  </div>
                </div>

                {/* Brightness Dial */}
                <div className="relative">
                  <div className="dial-ticks"></div>
                  <div className="flex flex-col items-center">
                    <div
                      className="w-16 h-16 rounded-full bg-gray-900 border-4 border-gray-700 relative dial cursor-grab active:cursor-grabbing"
                      style={{ transform: `rotate(${(brightness - 0.2) * 300}deg)` }}
                      onMouseDown={handleBrightnessDial}
                    >
                      <div className="absolute w-1 h-8 bg-amber-500 left-1/2 -translate-x-1/2 origin-bottom"></div>
                    </div>
                    <span className={`${spaceMono.className} text-amber-500 text-xs mt-2 tracking-[0.2em] uppercase`}>
                      Brightness
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TV Stand */}
          <div className="absolute left-1/2 -bottom-16 -translate-x-1/2 w-48 h-16">
            <div className="w-full h-full relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-gray-800"></div>
              <div className="absolute bottom-0 left-0 w-2 h-full bg-gray-800 transform -skew-x-12"></div>
              <div className="absolute bottom-0 right-0 w-2 h-full bg-gray-800 transform skew-x-12"></div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}

