// ----- MAIN GAME COMPONENT -----
export default function Game() {
  // ---- Game State ----
  const [gameState, setGameState] = useState<"playing" | "completed" | "lost" | "won">("playing");

  // Start at level 0 => show "Start Game" button
  const [currentLevel, setCurrentLevel] = useState(0);

  // Blink Count per level
  const [blinkCount, setBlinkCount] = useState(0);

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
        >
          <div className="relative flex-1">
            {/* TV Screen Area */}
            <div className="relative bg-black p-6 rounded-lg border-12 tv-frame">
              <div className="relative aspect-[4/3] overflow-hidden rounded tv-screen">
                <AnimatePresence mode="wait">
                  {/* LEVEL 0 => WAITING FOR START */}
                  {currentLevel === 0 && (
                    <motion.div
                      key="level-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full h-full flex items-center justify-center"
                    >
                      <span className="text-white text-2xl">Press Start</span>
                    </motion.div>
                  )}

                  {/* PLAYING => EMBED YOUTUBE VIDEO */}
                  {gameState === "playing" && currentLevel > 0 && (
                    <motion.div key="playing" className="w-full h-full">
                      <ReactPlayer
                        url={levelVideos[currentLevel - 1] || ""}
                        playing={true}
                        controls={false}
                        width="100%"
                        height="100%"
                        onEnded={() => {
                          if (currentLevel === levelVideos.length) {
                            setGameState("won"); // Set "won" if this was the last video
                          } else {
                            setGameState("completed");
                          }
                        }}
                      />
                    </motion.div>
                  )}

                  {/* COMPLETED => SHOW "LEVEL COMPLETED" SCREEN */}
                  {gameState === "completed" && (
                    <motion.div key="completed" className="w-full h-full flex items-center justify-center bg-green-500 text-white">
                      <span className="text-4xl animate-pulse">Level {currentLevel} Completed!</span>
                    </motion.div>
                  )}

                  {/* LOST => SHOW "YOU LOSE" SCREEN */}
                  {gameState === "lost" && (
                    <motion.div key="lost" className="w-full h-full flex items-center justify-center bg-red-500 text-white">
                      <span className="text-4xl animate-bounce">You Lose!</span>
                    </motion.div>
                  )}

                  {/* WON => SHOW "YOU WIN" SCREEN */}
                  {gameState === "won" && (
                    <motion.div
                      key="won"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full h-full flex flex-col items-center justify-center bg-yellow-500 text-white"
                    >
                      <span className="text-5xl font-bold animate-pulse">YOU WIN!</span>
                      <span className="text-lg mt-4">You survived all levels without looking away.</span>
                      <Link href="/">
                        <button className="mt-6 px-6 py-3 bg-white text-black font-bold rounded-lg">
                          Play Again
                        </button>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="w-64 flex flex-col gap-6 p-6 bg-gray-800 rounded-r-lg tv-controls">
            {/* LEVEL DISPLAY */}
            <motion.div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-black border-4 border-gray-700 flex items-center justify-center">
                <span className={`${spaceMono.className} text-amber-500 text-2xl font-bold`}>
                  {currentLevel.toString().padStart(2, "0")}
                </span>
              </div>
              <span className={`${spaceMono.className} text-amber-500 text-xs tracking-[0.2em] uppercase`}>
                Level
              </span>
            </motion.div>

            {/* GAME BUTTONS */}
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
                    className="w-full bg-blue-900 hover:bg-blue-800 text-blue-200 text-sm py-3 px-4 rounded border-2 border-blue-950"
                  >
                    START GAME
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
                    className="w-full bg-green-900 hover:bg-green-800 text-green-200 text-sm py-3 px-4 rounded border-2 border-green-950"
                  >
                    ► PRESS FOR NEXT LEVEL ◄
                  </motion.button>
                )}

                {/* TRY AGAIN IF LOST */}
                {gameState === "lost" && (
                  <motion.div key="lost-state" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                    <Link href="/">
                      <button className="w-full bg-blue-900 hover:bg-blue-800 text-blue-200 text-sm py-3 px-4 rounded border-2 border-blue-950">
                        TRY AGAIN
                      </button>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
