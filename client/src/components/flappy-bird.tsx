import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, RotateCcw, Trophy, Bird } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Pipe {
    id: number;
    x: number;
    gapTop: number;
    passed: boolean;
}

const GAME_WIDTH = 200;
const GAME_HEIGHT = 280;
const BIRD_SIZE = 20;
const BIRD_X = 35;
const PIPE_WIDTH = 35;
const PIPE_GAP = 90;
const GRAVITY = 0.45;
const JUMP_FORCE = -7;
const PIPE_SPEED = 2.2;

export function FlappyBird() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('flappyHighScore');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [birdY, setBirdY] = useState(GAME_HEIGHT / 2);
    const [birdVelocity, setBirdVelocity] = useState(0);
    const [pipes, setPipes] = useState<Pipe[]>([]);
    const [gameOver, setGameOver] = useState(false);
    const [rotation, setRotation] = useState(0);
    const gameLoopRef = useRef<number | undefined>(undefined);
    const pipeIdRef = useRef(0);

    const resetGame = useCallback(() => {
        setBirdY(GAME_HEIGHT / 2);
        setBirdVelocity(0);
        setPipes([]);
        setScore(0);
        setGameOver(false);
        setRotation(0);
        pipeIdRef.current = 0;
    }, []);

    const startGame = useCallback(() => {
        resetGame();
        setIsPlaying(true);
    }, [resetGame]);

    const jump = useCallback(() => {
        if (!isPlaying || gameOver) return;
        setBirdVelocity(JUMP_FORCE);
    }, [isPlaying, gameOver]);

    const handleClick = useCallback(() => {
        if (!isPlaying) {
            startGame();
        } else if (gameOver) {
            resetGame();
            setIsPlaying(true);
        } else {
            jump();
        }
    }, [isPlaying, gameOver, startGame, jump, resetGame]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            handleClick();
        }
    }, [handleClick]);

    useEffect(() => {
        if (!isOpen) return;
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleKeyDown]);

    useEffect(() => {
        if (!isPlaying || gameOver) {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
            return;
        }

        const gameLoop = () => {
            // Update bird
            setBirdVelocity(v => v + GRAVITY);
            setBirdY(y => {
                const newY = y + birdVelocity;
                // Ground and ceiling collision
                if (newY <= 0 || newY >= GAME_HEIGHT - BIRD_SIZE) {
                    setGameOver(true);
                    if (score > highScore) {
                        setHighScore(score);
                        localStorage.setItem('flappyHighScore', score.toString());
                    }
                    return Math.max(0, Math.min(GAME_HEIGHT - BIRD_SIZE, newY));
                }
                return newY;
            });

            // Update rotation based on velocity
            setRotation(Math.min(90, Math.max(-30, birdVelocity * 4)));

            // Update pipes
            setPipes(currentPipes => {
                let newPipes = currentPipes
                    .map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }))
                    .filter(pipe => pipe.x > -PIPE_WIDTH);

                // Check for score
                newPipes = newPipes.map(pipe => {
                    if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
                        setScore(s => s + 1);
                        return { ...pipe, passed: true };
                    }
                    return pipe;
                });

                // Add new pipe
                const lastPipe = newPipes[newPipes.length - 1];
                if (!lastPipe || lastPipe.x < GAME_WIDTH - 120) {
                    const gapTop = 40 + Math.random() * (GAME_HEIGHT - PIPE_GAP - 80);
                    newPipes.push({
                        id: pipeIdRef.current++,
                        x: GAME_WIDTH,
                        gapTop,
                        passed: false,
                    });
                }

                // Check collision
                const birdBox = {
                    left: BIRD_X,
                    right: BIRD_X + BIRD_SIZE,
                    top: birdY,
                    bottom: birdY + BIRD_SIZE,
                };

                for (const pipe of newPipes) {
                    const pipeBox = {
                        left: pipe.x,
                        right: pipe.x + PIPE_WIDTH,
                    };

                    if (birdBox.right > pipeBox.left && birdBox.left < pipeBox.right) {
                        if (birdBox.top < pipe.gapTop || birdBox.bottom > pipe.gapTop + PIPE_GAP) {
                            setGameOver(true);
                            if (score > highScore) {
                                setHighScore(score);
                                localStorage.setItem('flappyHighScore', score.toString());
                            }
                            break;
                        }
                    }
                }

                return newPipes;
            });

            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };

        gameLoopRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
        };
    }, [isPlaying, gameOver, birdVelocity, birdY, score, highScore]);

    return (
        <>
            {/* Floating Bird Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className={cn(
                            "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full",
                            "bg-gradient-to-br from-amber-400 via-orange-500 to-red-500",
                            "flex items-center justify-center shadow-xl",
                            "hover:shadow-2xl hover:shadow-orange-500/30",
                            "border-2 border-white/20 transition-shadow"
                        )}
                        title="Play Flappy Bird!"
                    >
                        <Bird className="w-7 h-7 text-white drop-shadow-md" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Game Container */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 100 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.5, opacity: 0, y: 100 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="fixed bottom-6 right-6 z-50 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                        style={{
                            width: GAME_WIDTH + 16,
                            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
                            <div className="flex items-center gap-2">
                                <Bird className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-bold text-white/90 tracking-wide">FLAPPY</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                                    <Trophy className="w-3 h-3" />
                                    {highScore}
                                </div>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setIsPlaying(false);
                                        setGameOver(false);
                                        resetGame();
                                    }}
                                    className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Score Display */}
                        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10">
                            <span className="text-4xl font-black text-white drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                                {score}
                            </span>
                        </div>

                        {/* Game Canvas */}
                        <div
                            className="relative overflow-hidden cursor-pointer"
                            style={{
                                width: GAME_WIDTH,
                                height: GAME_HEIGHT,
                                margin: '8px',
                                borderRadius: '12px',
                                background: 'linear-gradient(180deg, #0ea5e9 0%, #38bdf8 50%, #7dd3fc 100%)',
                            }}
                            onClick={handleClick}
                        >
                            {/* Clouds */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-8 left-10 w-12 h-5 bg-white/40 rounded-full blur-sm" />
                                <div className="absolute top-6 left-14 w-8 h-4 bg-white/30 rounded-full blur-sm" />
                                <div className="absolute top-20 right-8 w-10 h-4 bg-white/35 rounded-full blur-sm" />
                                <div className="absolute top-16 right-6 w-6 h-3 bg-white/25 rounded-full blur-sm" />
                            </div>

                            {/* Ground */}
                            <div
                                className="absolute bottom-0 left-0 right-0 h-4"
                                style={{
                                    background: 'linear-gradient(180deg, #84cc16 0%, #65a30d 50%, #4d7c0f 100%)',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                                }}
                            />

                            {/* Pipes */}
                            {pipes.map(pipe => (
                                <React.Fragment key={pipe.id}>
                                    {/* Top Pipe */}
                                    <div
                                        className="absolute"
                                        style={{
                                            left: pipe.x,
                                            top: 0,
                                            width: PIPE_WIDTH,
                                            height: pipe.gapTop,
                                            background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
                                            borderRadius: '0 0 4px 4px',
                                            boxShadow: '2px 2px 4px rgba(0,0,0,0.3), inset -2px 0 4px rgba(255,255,255,0.2)',
                                        }}
                                    >
                                        {/* Pipe Cap */}
                                        <div
                                            className="absolute -left-1 -right-1 h-6"
                                            style={{
                                                bottom: -3,
                                                background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
                                                borderRadius: '4px',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                            }}
                                        />
                                    </div>
                                    {/* Bottom Pipe */}
                                    <div
                                        className="absolute"
                                        style={{
                                            left: pipe.x,
                                            top: pipe.gapTop + PIPE_GAP,
                                            width: PIPE_WIDTH,
                                            height: GAME_HEIGHT - pipe.gapTop - PIPE_GAP - 16,
                                            background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
                                            borderRadius: '4px 4px 0 0',
                                            boxShadow: '2px 2px 4px rgba(0,0,0,0.3), inset -2px 0 4px rgba(255,255,255,0.2)',
                                        }}
                                    >
                                        {/* Pipe Cap */}
                                        <div
                                            className="absolute -left-1 -right-1 h-6"
                                            style={{
                                                top: -3,
                                                background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
                                                borderRadius: '4px',
                                                boxShadow: '0 -2px 4px rgba(0,0,0,0.3)',
                                            }}
                                        />
                                    </div>
                                </React.Fragment>
                            ))}

                            {/* Bird */}
                            <div
                                className="absolute pointer-events-none transition-transform"
                                style={{
                                    left: BIRD_X,
                                    top: birdY,
                                    width: BIRD_SIZE,
                                    height: BIRD_SIZE,
                                    transform: `rotate(${rotation}deg)`,
                                }}
                            >
                                <div
                                    className="w-full h-full rounded-full relative"
                                    style={{
                                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.4)',
                                    }}
                                >
                                    {/* Eye */}
                                    <div
                                        className="absolute w-2 h-2 bg-white rounded-full"
                                        style={{ top: 4, right: 3 }}
                                    >
                                        <div
                                            className="absolute w-1 h-1 bg-black rounded-full"
                                            style={{ top: 1, right: 1 }}
                                        />
                                    </div>
                                    {/* Beak */}
                                    <div
                                        className="absolute"
                                        style={{
                                            right: -4,
                                            top: 8,
                                            width: 0,
                                            height: 0,
                                            borderTop: '3px solid transparent',
                                            borderBottom: '3px solid transparent',
                                            borderLeft: '6px solid #ff6b35',
                                        }}
                                    />
                                    {/* Wing */}
                                    <div
                                        className="absolute w-3 h-2 rounded-full"
                                        style={{
                                            left: 2,
                                            top: 10,
                                            background: 'linear-gradient(180deg, #fcd34d 0%, #fbbf24 100%)',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Start Screen */}
                            {!isPlaying && !gameOver && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px]">
                                    <motion.div
                                        initial={{ y: 10 }}
                                        animate={{ y: -10 }}
                                        transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.5 }}
                                    >
                                        <Bird className="w-12 h-12 text-amber-400 drop-shadow-lg" />
                                    </motion.div>
                                    <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm">
                                        <Play className="w-4 h-4 text-white" />
                                        <span className="text-white font-bold text-sm">Click to Start</span>
                                    </div>
                                </div>
                            )}

                            {/* Game Over Screen */}
                            {gameOver && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm"
                                >
                                    <div className="text-red-500 font-black text-xl mb-2 drop-shadow-lg">GAME OVER</div>
                                    <div className="text-white text-sm mb-1">Score: {score}</div>
                                    {score === highScore && score > 0 && (
                                        <div className="text-amber-400 text-xs font-bold mb-3 flex items-center gap-1">
                                            <Trophy className="w-3 h-3" /> NEW HIGH SCORE!
                                        </div>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            resetGame();
                                            setIsPlaying(true);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-bold text-sm transition-colors shadow-lg"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Play Again
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-2 text-center border-t border-white/10">
                            <span className="text-[10px] text-white/40 font-medium tracking-wider">
                                CLICK OR PRESS SPACE TO FLAP
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default FlappyBird;
