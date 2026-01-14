import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Coins, Sparkles, RotateCcw, Crown, Medal, Award, TrendingUp, Dices } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSlotsCredits, spinSlots, resetSlotsCredits, fetchSlotsLeaderboard } from '@/lib/api';
import type { SlotsCredits } from '@shared/schema';

// Slot symbols with their weights and payouts
const SYMBOLS = [
    { emoji: '🍒', name: 'cherry', weight: 20, payout: 2 },
    { emoji: '🍋', name: 'lemon', weight: 18, payout: 3 },
    { emoji: '🍊', name: 'orange', weight: 16, payout: 4 },
    { emoji: '🍇', name: 'grape', weight: 14, payout: 5 },
    { emoji: '🔔', name: 'bell', weight: 10, payout: 8 },
    { emoji: '⭐', name: 'star', weight: 8, payout: 12 },
    { emoji: '💎', name: 'diamond', weight: 5, payout: 25 },
    { emoji: '7️⃣', name: 'seven', weight: 3, payout: 50 },
];

const BET_AMOUNTS = [1, 5, 10, 25];

function getRandomSymbol(): typeof SYMBOLS[0] {
    const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const symbol of SYMBOLS) {
        random -= symbol.weight;
        if (random <= 0) return symbol;
    }
    return SYMBOLS[0];
}

export function SlotsGame() {
    const [isOpen, setIsOpen] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [isSpinning, setIsSpinning] = useState(false);
    const [reels, setReels] = useState([SYMBOLS[0], SYMBOLS[0], SYMBOLS[0]]);
    const [betAmount, setBetAmount] = useState(5);
    const [lastWin, setLastWin] = useState<number | null>(null);
    const [showWinAnimation, setShowWinAnimation] = useState(false);
    const spinSoundRef = useRef<HTMLAudioElement | null>(null);
    const winSoundRef = useRef<HTMLAudioElement | null>(null);

    const { currentUser } = useUser();
    const queryClient = useQueryClient();

    // Fetch user's credits
    const { data: credits, isLoading: creditsLoading } = useQuery({
        queryKey: ['slots-credits', currentUser],
        queryFn: () => currentUser ? fetchSlotsCredits(currentUser, currentUser) : null,
        enabled: !!currentUser && isOpen,
    });

    // Fetch leaderboard
    const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
        queryKey: ['slots-leaderboard'],
        queryFn: () => fetchSlotsLeaderboard(10),
        enabled: isOpen,
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    // Spin mutation
    const spinMutation = useMutation({
        mutationFn: ({ creditsChange, isWin }: { creditsChange: number; isWin: boolean }) =>
            spinSlots(currentUser!, currentUser!, creditsChange, isWin),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['slots-credits', currentUser] });
            queryClient.invalidateQueries({ queryKey: ['slots-leaderboard'] });
        },
    });

    // Reset mutation
    const resetMutation = useMutation({
        mutationFn: () => resetSlotsCredits(currentUser!, currentUser!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['slots-credits', currentUser] });
        },
    });

    const spin = useCallback(async () => {
        if (!credits || credits.credits < betAmount || isSpinning) return;

        setIsSpinning(true);
        setLastWin(null);
        setShowWinAnimation(false);

        // Generate final symbols
        const finalReels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

        // Animate reels spinning
        const spinDuration = 2000;
        const frameInterval = 50;
        const totalFrames = spinDuration / frameInterval;

        for (let i = 0; i < totalFrames; i++) {
            await new Promise(resolve => setTimeout(resolve, frameInterval));
            // Slow down near the end
            const slowdownFactor = Math.max(1 - (i / totalFrames), 0);
            if (Math.random() < slowdownFactor * 0.8 + 0.2) {
                setReels([getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
            }
        }

        // Set final result
        setReels(finalReels);
        setIsSpinning(false);

        // Check for win
        const allMatch = finalReels[0].name === finalReels[1].name && finalReels[1].name === finalReels[2].name;
        const twoMatch = finalReels[0].name === finalReels[1].name || finalReels[1].name === finalReels[2].name || finalReels[0].name === finalReels[2].name;

        let winAmount = 0;
        if (allMatch) {
            // Triple match - full payout
            winAmount = betAmount * finalReels[0].payout;
            setShowWinAnimation(true);
        } else if (twoMatch) {
            // Two match - small payout
            const matchingSymbol = finalReels[0].name === finalReels[1].name
                ? finalReels[0]
                : finalReels[1].name === finalReels[2].name
                    ? finalReels[1]
                    : finalReels[0];
            winAmount = Math.floor(betAmount * (matchingSymbol.payout / 4));
        }

        const creditsChange = winAmount - betAmount;
        setLastWin(winAmount > 0 ? winAmount : null);

        // Update server
        await spinMutation.mutateAsync({ creditsChange, isWin: winAmount > 0 });

    }, [credits, betAmount, isSpinning, spinMutation]);

    // Reset win animation after 2 seconds
    useEffect(() => {
        if (showWinAnimation) {
            const timer = setTimeout(() => setShowWinAnimation(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [showWinAnimation]);

    const getRankIcon = (index: number) => {
        if (index === 0) return <Crown className="w-4 h-4 text-yellow-400" />;
        if (index === 1) return <Medal className="w-4 h-4 text-slate-400" />;
        if (index === 2) return <Award className="w-4 h-4 text-amber-600" />;
        return <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold text-slate-400">#{index + 1}</span>;
    };

    return (
        <>
            {/* Floating Slots Button */}
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
                            "fixed bottom-6 right-24 z-50 w-14 h-14 rounded-full",
                            "bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-700",
                            "flex items-center justify-center shadow-xl",
                            "hover:shadow-2xl hover:shadow-purple-500/30",
                            "border-2 border-white/20 transition-shadow"
                        )}
                        title="Play Slots!"
                    >
                        <Dices className="w-7 h-7 text-white drop-shadow-md" />
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
                        className="fixed bottom-6 right-24 z-50 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                        style={{
                            width: showLeaderboard ? 360 : 280,
                            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-indigo-600/20">
                            <div className="flex items-center gap-2">
                                <Dices className="w-5 h-5 text-purple-400" />
                                <span className="text-sm font-bold text-white/90 tracking-wide">SLOTS</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowLeaderboard(!showLeaderboard)}
                                    className={cn(
                                        "p-1.5 rounded-md transition-colors",
                                        showLeaderboard ? "bg-purple-500/30 text-purple-300" : "hover:bg-white/10 text-white/60 hover:text-white"
                                    )}
                                    title="Leaderboard"
                                >
                                    <Trophy className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowLeaderboard(false);
                                    }}
                                    className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex">
                            {/* Main Game Area */}
                            <div className="flex-1 p-4">
                                {/* Credits Display */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Coins className="w-5 h-5 text-yellow-400" />
                                        <span className="text-2xl font-black text-yellow-400">
                                            {creditsLoading ? '...' : credits?.credits ?? 100}
                                        </span>
                                    </div>
                                    {credits?.credits === 0 && (
                                        <button
                                            onClick={() => resetMutation.mutate()}
                                            disabled={resetMutation.isPending}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-green-600 hover:bg-green-500 rounded-lg text-white transition-colors"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Reset to 100
                                        </button>
                                    )}
                                </div>

                                {/* Slot Machine */}
                                <div
                                    className="relative rounded-xl p-3 mb-4"
                                    style={{
                                        background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
                                        boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.5), 0 0 20px rgba(139, 92, 246, 0.3)',
                                    }}
                                >
                                    {/* Win animation overlay */}
                                    <AnimatePresence>
                                        {showWinAnimation && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 z-10 flex items-center justify-center rounded-xl"
                                                style={{ background: 'radial-gradient(circle, rgba(250, 204, 21, 0.3) 0%, transparent 70%)' }}
                                            >
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: [0, 1.2, 1] }}
                                                    className="flex items-center gap-1"
                                                >
                                                    <Sparkles className="w-6 h-6 text-yellow-400" />
                                                    <span className="text-2xl font-black text-yellow-400 drop-shadow-lg">+{lastWin}</span>
                                                    <Sparkles className="w-6 h-6 text-yellow-400" />
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Reels */}
                                    <div className="flex justify-center gap-2">
                                        {reels.map((symbol, i) => (
                                            <motion.div
                                                key={i}
                                                className="w-16 h-16 rounded-lg flex items-center justify-center"
                                                style={{
                                                    background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
                                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                                                }}
                                                animate={isSpinning ? {
                                                    y: [0, -5, 5, 0],
                                                } : {}}
                                                transition={{
                                                    repeat: isSpinning ? Infinity : 0,
                                                    duration: 0.1,
                                                    delay: i * 0.05,
                                                }}
                                            >
                                                <span className="text-4xl select-none">{symbol.emoji}</span>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Decorative lights */}
                                    <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: showWinAnimation ? '#fde047' : '#6366f1' }}
                                                animate={showWinAnimation ? { opacity: [1, 0.5, 1] } : {}}
                                                transition={{ repeat: Infinity, duration: 0.3, delay: i * 0.1 }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Bet Controls */}
                                <div className="mb-4">
                                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Bet Amount</div>
                                    <div className="flex gap-1">
                                        {BET_AMOUNTS.map(amount => (
                                            <button
                                                key={amount}
                                                onClick={() => setBetAmount(amount)}
                                                disabled={isSpinning || (credits?.credits ?? 0) < amount}
                                                className={cn(
                                                    "flex-1 py-2 rounded-lg font-bold text-sm transition-all",
                                                    betAmount === amount
                                                        ? "bg-purple-600 text-white shadow-lg"
                                                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-700",
                                                    (credits?.credits ?? 0) < amount && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                {amount}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Spin Button */}
                                <motion.button
                                    onClick={spin}
                                    disabled={isSpinning || !credits || credits.credits < betAmount}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={cn(
                                        "w-full py-3 rounded-xl font-black text-lg uppercase tracking-wider transition-all",
                                        "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600",
                                        "text-white shadow-lg shadow-purple-500/30",
                                        "hover:shadow-xl hover:shadow-purple-500/40",
                                        "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                >
                                    {isSpinning ? (
                                        <motion.span
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1 }}
                                            className="inline-block"
                                        >
                                            🎰
                                        </motion.span>
                                    ) : (
                                        <>SPIN - {betAmount}</>
                                    )}
                                </motion.button>

                                {/* Last Win */}
                                {lastWin !== null && !showWinAnimation && (
                                    <div className="mt-3 text-center">
                                        <span className="text-green-400 font-bold text-sm">
                                            Won +{lastWin} credits!
                                        </span>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                                    <div className="bg-slate-800/50 rounded-lg p-2">
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">High Score</div>
                                        <div className="text-lg font-bold text-amber-400 flex items-center justify-center gap-1">
                                            <TrendingUp className="w-4 h-4" />
                                            {credits?.highScore ?? 100}
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-2">
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Games</div>
                                        <div className="text-lg font-bold text-purple-400">
                                            {credits?.gamesPlayed ?? 0}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Leaderboard Panel */}
                            <AnimatePresence>
                                {showLeaderboard && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 140, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="border-l border-white/10 overflow-hidden"
                                    >
                                        <div className="p-3 h-full">
                                            <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <Trophy className="w-3 h-3" />
                                                Leaderboard
                                            </div>

                                            {leaderboardLoading ? (
                                                <div className="text-slate-400 text-xs">Loading...</div>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {leaderboard?.slice(0, 8).map((entry, index) => (
                                                        <div
                                                            key={entry.id}
                                                            className={cn(
                                                                "flex items-center gap-2 p-1.5 rounded-lg text-xs",
                                                                entry.username === currentUser && "bg-purple-500/20 border border-purple-500/30"
                                                            )}
                                                        >
                                                            {getRankIcon(index)}
                                                            <div className="flex-1 min-w-0">
                                                                <div className={cn(
                                                                    "truncate font-medium",
                                                                    entry.username === currentUser ? "text-purple-300" : "text-white/80"
                                                                )}>
                                                                    {entry.username}
                                                                </div>
                                                            </div>
                                                            <div className="text-amber-400 font-bold text-[10px]">
                                                                {entry.highScore}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {(!leaderboard || leaderboard.length === 0) && (
                                                        <div className="text-slate-500 text-[10px] text-center py-4">
                                                            No players yet!
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-2 text-center border-t border-white/10 bg-slate-900/50">
                            <span className="text-[9px] text-white/30 font-medium tracking-wider">
                                Match 3 for big wins • Match 2 for small wins
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default SlotsGame;
