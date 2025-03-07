"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import type { ReactPlayerProps } from "react-player";
import screenfull from "screenfull";
import { Creepster, Space_Mono } from "next/font/google";

// ----- FONTS -----
const creepster = Creepster({ weight: "400", subsets: ["latin"] });
const spaceMono = Space_Mono({ weight: "400", subsets: ["latin"] });

// ----- CONFIG -----
const MAX_BLINK_COUNT = 25; // increased from 10
const FRAME_RATE = 10;             // 10 fps
const BUFFER_LENGTH = FRAME_RATE * 5; // store last 5s => 50 frames

const levelVideos = [
  "https://www.youtube.com/watch?v=W184Uc2zC2Y",
  "https://www.youtube.com/watch?v=oEFSxtjbrq4&ab_channel=PeterGriffin",
  "https://www.youtube.com/watch?v=zRlaf5uI2uA&ab_channel=RobertRyanIV",
  "https://www.youtube.com/watch?v=TZiSWOhDIwQ&rco=1&ab_channel=BlueLightningSpecter",
  "https://www.youtube.com/watch?v=qsJkFb7UW_g&ab_channel=RifqiFirdaus",
  "https://www.youtube.com/watch?v=GMgsFZ4rkEI&ab_channel=BriennRockhill",
  "https://www.youtube.com/watch?v=dJ0Bqg3I9SQ&ab_channel=HeysonLam",
  "https://www.youtube.com/watch?v=DCeVPPBq2Xc",
  "https://www.youtube.com/watch?v=l4SFiMrYplM&ab_channel=TFGOrbitzZ",
  "https://www.youtube.com/watch?v=oo8tfJ2jz_Y&ab_channel=TNTgamer1"
];

// Dynamically load ReactPlayer
const ReactPlayer = dynamic(
  () =>
    import("react-player").then((mod) => mod.default) as Promise<
      React.ComponentType<ReactPlayerProps>
    >,
  { ssr: false }
);

// Replay overlay for last 5 seconds
function ReplayOverlay({
  frames,
  onClose,
}: {
  frames: string[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (frames.length === 0) return;
    const frameTimer = setInterval(() => {
      setIndex((prev) => {
        const next = prev + 1;
        return next >= frames.length ? 0 : next;
      });
    }, 1000 / FRAME_RATE);

    return () => clearInterval(frameTimer);
  }, [frames]);

  return (
    <div className="absolute top-0 left-0 w-full h-full bg-black/90 z-50 flex flex-col items-center justify-center">
      <div className="text-white mb-4">Replay: Last 5 Seconds</div>
      {frames.length > 0 && (
        <img
          src={frames[index]}
          alt="Replay Frame"
          className="w-[320px] h-[240px] object-cover border-2 border-white"
        />
      )}
      <button
        className="mt-4 px-4 py-2 bg-gray-700 text-white rounded"
        onClick={onClose}
      >
        Close Replay
      </button>
    </div>
  );
}

export default function Game() {
  const [gameState, setGameState] = useState<"playing" | "completed" | "lost">("playing");
  const [currentLevel, setCurrentLevel] = useState(0);
  const [blinkCount, setBlinkCount] = useState(0);

  const [volume, setVolume] = useState(0.5);
  const [brightness, setBrightness] = useState(1);

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);

  const cameraBufferRef = useRef<string[]>([]);
  const [showReplay, setShowReplay] = useState(false);
  const [replayFrames, setReplayFrames] = useState<string[]>([]);

  // ReactPlayer container for fullscreen
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fsButtonText = isFullscreen ? "Exit Fullscreen" : "Fullscreen";

  // Listen to screenfull events
  useEffect(() => {
    if (screenfull.isEnabled) {
      const onChange = () => setIsFullscreen(screenfull.isFullscreen);
      screenfull.on("change", onChange);
      return () => {
        screenfull.off("change", onChange);
      };
    }
  }, []);

  // Setup WebSocket
  useEffect(() => {
    const ws = new WebSocket("wss://staring-app-backend-production.up.railway.app/ws/video");
    setSocket(ws);

    ws.onopen = () => console.log("WebSocket connected!");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("From server:", data);

      if (currentLevel > 0 && gameState === "playing") {
        if (data.status === "Looked away") handleLose();
        else if (data.status === "Distracted") {
          setBlinkCount((prev) => {
            const newCount = prev + 1;
            if (newCount >= MAX_BLINK_COUNT) handleLose();
            return newCount;
          });
        }
      }
    };
    ws.onerror = (err) => console.error("WebSocket error:", err);
    ws.onclose = () => console.log("WebSocket closed.");

    return () => ws.close();
  }, [currentLevel, gameState]);

  // Invert camera & buffer frames
  useEffect(() => {
    if (!socket || !webcamRef.current) return;

    const sendFrame = () => {
      if (!webcamRef.current || socket.readyState !== WebSocket.OPEN) return;

      const videoEl = webcamRef.current;
      if (!videoEl.videoWidth || !videoEl.videoHeight) return;

      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Flip horizontally
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      // Save to buffer
      const frameData = canvas.toDataURL("image/jpeg", 0.6);
      cameraBufferRef.current.push(frameData);
      if (cameraBufferRef.current.length > BUFFER_LENGTH) {
        cameraBufferRef.current.shift();
      }

      // Send to server
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

    const intervalId = setInterval(sendFrame, 1000 / FRAME_RATE);
    return () => clearInterval(intervalId);
  }, [socket, gameState]);

  // Request webcam
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then((stream) => {
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("Webcam error:", err));
  }, []);

  // If user switches tabs/apps, they lose
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && gameState === "playing") handleLose();
    };
    const handleBlur = () => {
      if (gameState === "playing") handleLose();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [gameState]);

  // Lose => wait 3s => show replay
  const handleLose = () => {
    setGameState("lost");
    const framesCopy = [...cameraBufferRef.current];
    cameraBufferRef.current = [];
    setTimeout(() => {
      setReplayFrames(framesCopy);
      setShowReplay(true);
    }, 1500);
  };

  // Attempt starting the game
  const handleStartGame = () => {
    setCurrentLevel(1);
    setGameState("playing");
    setBlinkCount(0);
  };

  // Attempt next level
  const handleNextLevel = () => {
    setCurrentLevel((prev) => prev + 1);
    setGameState("playing");
    setBlinkCount(0);
    cameraBufferRef.current = [];
  };

  // We do actual fullscreen once the video starts playing => see onPlay below

  const toggleFullscreen = () => {
    if (playerContainerRef.current && screenfull.isEnabled) {
      screenfull.toggle(playerContainerRef.current);
    }
  };

  // Volume dial
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

  // Brightness dial
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

  return (
    <main className="relative flex items-center justify-center min-h-screen bg-gray-900 p-4">
      {/* Branding */}
      <motion.h1
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`${creepster.className} absolute top-6 left-7 text-4xl text-white opacity-90 text-shadow z-10`}
      >
        Jumpscare Roulette
      </motion.h1>

      {/* Replay overlay */}
      {showReplay && (
        <ReplayOverlay
          frames={replayFrames}
          onClose={() => setShowReplay(false)}
        />
      )}

      <div className="relative max-w-[1200px] w-full">
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
                        className="w-full h-full flex items-center justify-center text-white"
                      >
                        <span className="text-xl">Press Start Game</span>
                      </motion.div>
                    )}

                    {/* PLAYING => EMBED YOUTUBE VIA ReactPlayer */}
                    {gameState === "playing" && currentLevel > 0 && (
                      <motion.div
                        key="playing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full relative"
                        ref={playerContainerRef}
                      >
                        <ReactPlayer
                          url={levelVideos[currentLevel - 1] || ""}
                          playing={true}
                          controls={false}
                          volume={volume}
                          muted={volume === 0}
                          width="100%"
                          height="100%"
                          style={{ pointerEvents: "none" }}
                          onPlay={() => {
                            // Once the video starts playing, go fullscreen
                            if (playerContainerRef.current && screenfull.isEnabled) {
                              screenfull.request(playerContainerRef.current);
                            }
                          }}
                          onEnded={() => {
                            if (gameState === "playing") {
                              setGameState("completed");
                            }
                          }}
                        />
                        {/* Fullscreen button bottom-right */}
                        <button
                          onClick={() => {
                            if (playerContainerRef.current && screenfull.isEnabled) {
                              screenfull.toggle(playerContainerRef.current);
                            }
                          }}
                          className="absolute bottom-2 right-2 bg-gray-700 text-white px-3 py-1 rounded z-10"
                        >
                          {fsButtonText}
                        </button>
                      </motion.div>
                    )}

                    {/* COMPLETED => LEVEL COMPLETED */}
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

                    {/* LOST => YOU LOSE */}
                    {gameState === "lost" && currentLevel > 0 && (
                      <motion.div
                        key="lost"
                        initial={{ opacity: 0, rotateX: 90 }}
                        animate={{
                          opacity: 1,
                          rotateX: 0,
                          transition: { type: "spring", duration: 0.7 }
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
              {/* Level + Blink Count */}
              <div className="flex-1 space-y-6">
                <motion.div
                  className="flex flex-col items-center gap-2"
                  animate={{
                    scale:
                      gameState === "completed" && currentLevel > 0
                        ? [1, 1.1, 1]
                        : 1
                  }}
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
                        onClick={() => {
                          // Start the level
                          setCurrentLevel(1);
                          setGameState("playing");
                          setBlinkCount(0);
                        }}
                        className={`${spaceMono.className} w-full bg-blue-900 hover:bg-blue-800 text-blue-200 text-sm py-3 px-4 rounded border-2 border-blue-950 retro-button group relative overflow-hidden`}
                      >
                        <span className="inline-flex items-center gap-2">
                          START GAME
                        </span>
                        <div className="absolute inset-0 bg-blue-400/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200"></div>
                      </motion.button>
                    )}

                    {/* NEXT LEVEL */}
                    {gameState === "completed" && currentLevel > 0 && (
                      <motion.button
                        key="next-level"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        onClick={() => {
                          setCurrentLevel((prev) => prev + 1);
                          setGameState("playing");
                          setBlinkCount(0);
                          cameraBufferRef.current = [];
                        }}
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

          {/* TV Stand (Decor) */}
          <div className="absolute left-1/2 -bottom-16 -translate-x-1/2 w-48 h-16">
            <div className="w-full h-full relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-gray-800"></div>
              <div className="absolute bottom-0 left-0 w-2 h-full bg-gray-800 transform -skew-x-12"></div>
              <div className="absolute bottom-0 right-0 w-2 h-full bg-gray-800 transform skew-x-12"></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* WEBCAM FEED (mirrored so user sees themselves) */}
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
          transform: "scaleX(-1)"
        }}
      />
    </main>
  );
}
