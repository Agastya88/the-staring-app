"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import type { ReactPlayerProps } from "react-player";
import { Creepster, Space_Mono } from "next/font/google";

// ----- FONTS -----
const creepster = Creepster({ weight: "400", subsets: ["latin"] });
const spaceMono = Space_Mono({ weight: "400", subsets: ["latin"] });

// ----- CONFIG -----
const MAX_BLINK_COUNT = 10;

const levelVideos = [
  "https://www.youtube.com/watch?v=W184Uc2zC2Y", // Level 1: lights out
  "https://www.youtube.com/shorts/5MFSBMcYZTw", // Level 2: moonlight man
  "https://www.youtube.com/watch?v=DCeVPPBq2Xc",
  "https://www.youtube.com/watch?v=TZiSWOhDIwQ",
  "https://www.youtube.com/watch?v=FUQhNGEu2KA",
  "https://www.youtube.com/watch?v=qKpLOfgwpsU",
  "https://www.youtube.com/watch?v=0z6xGU2_g9s", // Level 3: bedfellows by FEWDIO
];

const ReactPlayer = dynamic(
  () =>
    import("react-player").then((mod) => mod.default) as Promise<
      React.ComponentType<ReactPlayerProps>
    >,
  { ssr: false }
);

// ----- MAIN GAME COMPONENT -----
export default function Game() {
  // ---- Game State ----
  const [gameState, setGameState] = useState<"playing" | "completed" | "lost">("playing");

  // Start at level 0 => show "Start Game" button
  const [currentLevel, setCurrentLevel] = useState(0);

  // Blink Count per level
  const [blinkCount, setBlinkCount] = useState(0);

  // ---- TV Volume / Brightness ----
  const [volume, setVolume] = useState(0.5); // 0 to 1
  const [brightness, setBrightness] = useState(1); // 0.2 to 1.2

  // ---- WebSocket State & Refs ----
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);

  // ---- Setup WebSocket on Mount ----
  useEffect(() => {
    const ws = new WebSocket("wss://staring-app-backend-production.up.railway.app/ws/video");
    setSocket(ws);

    ws.onopen = () => {
      console.log("WebSocket connected to backend!");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received from server:", data);

      // Only apply checks if we're at level > 0 and game is "playing"
      if (currentLevel > 0 && gameState === "playing") {
        if (data.status === "Looked away") {
          setGameState("lost"); // immediate loss
        } else if (data.status === "Distracted") {
          // Count as a blink
          setBlinkCount((prev) => {
            const newCount = prev + 1;
            if (newCount >= MAX_BLINK_COUNT) {
              setGameState("lost");
            }
            return newCount;
          });
        }
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket closed.");
    };

    return () => {
      ws.close();
    };
  }, [currentLevel, gameState]);

  // ---- Send Frames (with compression) ~10 FPS ----
  useEffect(() => {
    if (!socket || !webcamRef.current) return;

    const sendFrame = () => {
      if (!webcamRef.current || socket.readyState !== WebSocket.OPEN) return;

      const videoEl = webcamRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      // Compress frames at ~60% quality
      canvas.toBlob(
        (blob) => {
          if (blob) {
            blob.arrayBuffer().then((buffer) => {
              socket.send(buffer);
            });
          }
        },
        "image/jpeg",
        0.6
      );
    };

    const intervalId = setInterval(sendFrame, 100); // send frames every 100ms => ~10 fps
    return () => clearInterval(intervalId);
  }, [socket]);

  // ---- Request Webcam Stream at 320×240 ----
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then((stream) => {
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing webcam:", err);
      });
  }, []);

  // ---- Handlers ----
  const handleStartGame = () => {
    setCurrentLevel(1);
    setGameState("playing");
    setBlinkCount(0);
  };

  const handleNextLevel = () => {
    setCurrentLevel((prev) => prev + 1);
    setGameState("playing");
    setBlinkCount(0);
  };

  // ---- Dials: Volume / Brightness ----
  const handleVolumeDial = (e: React.MouseEvent<HTMLDivElement>) => {
    const dial = e.currentTarget;
    const rect = dial.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    const handleMove = (moveEvent: MouseEvent) => {
      const angle = Math.atan2(moveEvent.clientY - center.y, moveEvent.clientX - center.x);
      const degrees = angle * (180 / Math.PI) + 90;
      const normalized = degrees < 0 ? degrees + 360 : degrees;
      const newVolume = Math.max(0, Math.min(1, normalized / 360));
      setVolume(newVolume);
      dial.style.transform = `rotate(${normalized}deg)`;
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleBrightnessDial = (e: React.MouseEvent<HTMLDivElement>) => {
    const dial = e.currentTarget;
    const rect = dial.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    const handleMove = (moveEvent: MouseEvent) => {
      const angle = Math.atan2(moveEvent.clientY - center.y, moveEvent.clientX - center.x);
      const degrees = angle * (180 / Math.PI) + 90;
      const normalized = degrees < 0 ? degrees + 360 : degrees;
      const newBrightness = Math.max(0.2, Math.min(1.2, 0.2 + normalized / 360));
      setBrightness(newBrightness);
      dial.style.transform = `rotate(${normalized}deg)`;
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  // ---- Render ----
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
          style={{ filter: `brightness(${brightness})` }}
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
                    {/* LEVEL 0 => WAITING FOR START */}
                    {currentLevel === 0 && (
                      <motion.div
                        key="level-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full"
                      >
                        {/* Blank or "Press Start" screen */}
                      </motion.div>
                    )}

                    {/* PLAYING => EMBED YOUTUBE VIA ReactPlayer */}
                    {gameState === "playing" && currentLevel > 0 && (
                      <motion.div
                        key="playing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full"
                      >
                        <ReactPlayer
                          url={levelVideos[currentLevel - 1] || ""}
                          playing={true}
                          controls={false}
                          volume={volume}
                          muted={volume === 0}
                          width="100%"
                          height="100%"
                          // Because it's an iframe from YT, some CSS filters won't pass through
                          style={{ pointerEvents: "none" }} // user can't click to pause
                          onEnded={() => {
                            if (gameState === "playing") {
                              setGameState("completed");
                            }
                          }}
                        />
                      </motion.div>
                    )}

                    {/* COMPLETED => SHOW "LEVEL COMPLETED" SCREEN */}
                    {gameState === "completed" && currentLevel > 0 && (
                      <motion.div
                        key="completed"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: [0.8, 1.2, 1], opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-full h-full flex items-center justify-center bg-green-500 text-white"
                      >
                        <span className={`${creepster.className} text-4xl animate-pulse`}>
                          Level {currentLevel} Completed!
                        </span>
                      </motion.div>
                    )}

                    {/* LOST => SHOW "YOU LOSE" SCREEN */}
                    {gameState === "lost" && currentLevel > 0 && (
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
                        <span className={`${creepster.className} text-4xl animate-bounce`}>
                          You Lose!
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* TV Controls Panel */}
            <div className="w-64 flex flex-col gap-6 p-6 bg-gray-800 rounded-r-lg tv-controls">
              {/* Level Display + Blink Count */}
              <div className="flex-1 space-y-6">
                <motion.div
                  className="flex flex-col items-center gap-2"
                  animate={{ scale: gameState === "completed" && currentLevel > 0 ? [1, 1.1, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-20 h-20 rounded-full bg-black border-4 border-gray-700 flex items-center justify-center retro-screen">
                    <span className={`${spaceMono.className} text-amber-500 text-2xl font-bold`}>
                      {currentLevel.toString().padStart(2, "0")}
                    </span>
                  </div>
                  <span
                    className={`${spaceMono.className} text-amber-500 text-xs tracking-[0.2em] uppercase`}
                  >
                    Level
                  </span>
                </motion.div>

                {/* Blink count only when playing (and not level 0) */}
                {currentLevel > 0 && gameState === "playing" && (
                  <div className="flex flex-col items-center">
                    <span
                      className={`${spaceMono.className} text-xs text-gray-200 mb-1 tracking-wide`}
                    >
                      Blink Count: {blinkCount}
                    </span>
                    <span className={`${spaceMono.className} text-xs text-gray-400 tracking-wide`}>
                      Max: {MAX_BLINK_COUNT}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <AnimatePresence mode="wait">
                    {/* LEVEL 0 => START GAME */}
                    {currentLevel === 0 && (
                      <motion.button
                        key="start-game"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        onClick={handleStartGame}
                        className={`${spaceMono.className} w-full bg-blue-900 hover:bg-blue-800 text-blue-200 text-sm py-3 px-4 rounded border-2 border-blue-950 retro-button group relative overflow-hidden`}
                      >
                        <span className="inline-flex items-center gap-2">START GAME</span>
                        <div className="absolute inset-0 bg-blue-400/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200"></div>
                      </motion.button>
                    )}

                    {/* NEXT LEVEL BUTTON */}
                    {gameState === "completed" && currentLevel > 0 && (
                      <motion.button
                        key="next-level"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        onClick={handleNextLevel}
                        className={`${spaceMono.className} w-full bg-green-900 hover:bg-green-800 text-green-200 text-sm py-3 px-4 rounded border-2 border-green-950 retro-button group relative overflow-hidden`}
                      >
                        <span className="inline-flex items-center gap-2">
                          ► NEXT LEVEL ◄
                        </span>
                        <div className="absolute inset-0 bg-green-400/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200"></div>
                      </motion.button>
                    )}

                    {/* LOST => TRY AGAIN */}
                    {gameState === "lost" && currentLevel > 0 && (
                      <motion.div
                        key="lost-state"
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
                    <span
                      className={`${spaceMono.className} text-amber-500 text-xs mt-2 tracking-[0.2em] uppercase`}
                    >
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
                    <span
                      className={`${spaceMono.className} text-amber-500 text-xs mt-2 tracking-[0.2em] uppercase`}
                    >
                      Brightness
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TV Stand (Purely Decorative) */}
          <div className="absolute left-1/2 -bottom-16 -translate-x-1/2 w-48 h-16">
            <div className="w-full h-full relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-gray-800"></div>
              <div className="absolute bottom-0 left-0 w-2 h-full bg-gray-800 transform -skew-x-12"></div>
              <div className="absolute bottom-0 right-0 w-2 h-full bg-gray-800 transform skew-x-12"></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* WEBCAM FEED (Hidden or Visible) */}
      <video
        ref={webcamRef}
        autoPlay
        muted
        playsInline
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: "200px",
          border: "2px solid #fff",
          borderRadius: "8px",
          opacity: 0.7,
        }}
      />
    </main>
  );
}
