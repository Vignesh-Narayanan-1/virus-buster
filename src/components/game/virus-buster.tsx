"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// --- GAME CONSTANTS ---
const VIRUS_COLORS = ['#FF4136', '#0074D9', '#2ECC40', '#FFDC00', '#B10DC9'];
const GAME_WIDTH = 468;
const GAME_HEIGHT = 624;
const CANNON_BASE_Y = GAME_HEIGHT - 40;
const BUBBLE_DIAMETER = 24;
const VIRUS_DIAMETER = 30;
const BUBBLE_SPEED = 8;
const VIRUS_BASE_SPEED = 1;
const VIRUS_SPAWN_RATE_START = 1000; // ms
const VIRUS_SPAWN_ACCELERATION = 50; // ms reduction per 5 sec
const MAX_VIRUSES_MISSED = 10;
const BUBBLE_FIRE_RATE = 150; // ms between shots

// --- TYPES ---
type Virus = {
  id: number;
  x: number;
  y: number;
  color: string;
  speed: number;
};

type Bubble = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
};

type GameState = 'ready' | 'playing' | 'gameOver';

export function VirusBusterGame() {
  const [viruses, setViruses] = useState<Virus[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [cannonAngle, setCannonAngle] = useState(0);
  const [gameState, setGameState] = useState<GameState>('ready');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [virusesMissed, setVirusesMissed] = useState(0);
  const [isFiring, setIsFiring] = useState(false);
  const [virusSpawnRate, setVirusSpawnRate] = useState(VIRUS_SPAWN_RATE_START);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastFireTimeRef = useRef(0);
  const lastSpawnTimeRef = useRef(0);
  const gameTimeRef = useRef(0);
  const lastDifficultyIncrease = useRef(0);

  const resetGame = useCallback(() => {
    setViruses([]);
    setBubbles([]);
    setScore(0);
    setVirusesMissed(0);
    setGameState('ready');
    setCannonAngle(0);
    setIsFiring(false);
    gameTimeRef.current = 0;
    lastDifficultyIncrease.current = 0;
    setVirusSpawnRate(VIRUS_SPAWN_RATE_START);
    const storedHighScore = localStorage.getItem('virusBusterHighScore');
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10));
    }
  }, []);

  useEffect(() => {
    resetGame();
  }, [resetGame]);
  
  const handleGameOver = useCallback(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('virusBusterHighScore', score.toString());
    }
    setGameState('gameOver');
    setIsFiring(false);
  }, [score, highScore]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const gameX = e.clientX - rect.left;
    const cannonX = rect.width / 2;
    const cannonY = CANNON_BASE_Y;
    const angleRad = Math.atan2(e.clientY - rect.top - cannonY, gameX - cannonX);
    let angleDeg = angleRad * (180 / Math.PI) + 90;
    if (angleDeg < -80) angleDeg = -80;
    if (angleDeg > 80) angleDeg = 80;
    setCannonAngle(angleDeg);
  };
  
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState === 'ready') {
      setGameState('playing');
    } else if (gameState === 'playing') {
      setIsFiring(true);
    }
  };

  const handlePointerUp = () => {
    if (gameState === 'playing') {
      setIsFiring(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.repeat) return;
      if (e.key === 'ArrowLeft') setCannonAngle(a => Math.max(-80, a - 10));
      if (e.key === 'ArrowRight') setCannonAngle(a => Math.min(80, a + 10));
      if (e.key === ' ') {
        e.preventDefault();
        setIsFiring(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === ' ') {
            e.preventDefault();
            setIsFiring(false);
        }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);


  useEffect(() => {
    const gameLoop = (timestamp: number) => {
      if (gameState !== 'playing') {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        return;
      }

      gameTimeRef.current = timestamp;

      // --- Difficulty Scaling ---
      if (timestamp - lastDifficultyIncrease.current > 5000) {
        setVirusSpawnRate(r => Math.max(200, r - VIRUS_SPAWN_ACCELERATION));
        lastDifficultyIncrease.current = timestamp;
      }
      
      // --- Bubble Firing ---
      if (isFiring && timestamp - lastFireTimeRef.current > BUBBLE_FIRE_RATE) {
        lastFireTimeRef.current = timestamp;
        const angleRad = (cannonAngle - 90) * (Math.PI / 180);
        setBubbles(prev => [...prev, {
          id: timestamp,
          x: GAME_WIDTH / 2,
          y: CANNON_BASE_Y,
          dx: Math.cos(angleRad) * BUBBLE_SPEED,
          dy: Math.sin(angleRad) * BUBBLE_SPEED,
        }]);
      }

      // --- Virus Spawning ---
      if (timestamp - lastSpawnTimeRef.current > virusSpawnRate) {
        lastSpawnTimeRef.current = timestamp;
        const newVirus: Virus = {
          id: timestamp,
          x: Math.random() * (GAME_WIDTH - VIRUS_DIAMETER),
          y: -VIRUS_DIAMETER,
          color: VIRUS_COLORS[Math.floor(Math.random() * VIRUS_COLORS.length)],
          speed: VIRUS_BASE_SPEED + Math.random() * 1.5
        };
        setViruses(prev => [...prev, newVirus]);
      }
      
      // --- Update Positions & Collision ---
      let newBubbles: Bubble[] = [];
      let newViruses: Virus[] = [];
      const hitVirusIds = new Set<number>();

      // Update bubble positions
      bubbles.forEach(bubble => {
        const newBubble = { ...bubble, x: bubble.x + bubble.dx, y: bubble.y + bubble.dy };
        if (newBubble.y > -BUBBLE_DIAMETER && newBubble.x > -BUBBLE_DIAMETER && newBubble.x < GAME_WIDTH + BUBBLE_DIAMETER) {
          newBubbles.push(newBubble);
        }
      });

      // Update virus positions
      viruses.forEach(virus => {
        const newVirus = { ...virus, y: virus.y + virus.speed };
        if (newVirus.y < GAME_HEIGHT) {
            newViruses.push(newVirus);
        } else {
            setVirusesMissed(v => v + 1);
        }
      });
      
      // Collision detection
      const remainingBubbles: Bubble[] = [];
      newBubbles.forEach(bubble => {
        let hasHit = false;
        newViruses.forEach(virus => {
          if (!hitVirusIds.has(virus.id)) {
            const dist = Math.sqrt(Math.pow(bubble.x - (virus.x + VIRUS_DIAMETER/2), 2) + Math.pow(bubble.y - (virus.y + VIRUS_DIAMETER/2), 2));
            if (dist < (BUBBLE_DIAMETER / 2 + VIRUS_DIAMETER / 2)) {
              hasHit = true;
              hitVirusIds.add(virus.id);
            }
          }
        });
        if (!hasHit) {
          remainingBubbles.push(bubble);
        }
      });
      
      const remainingViruses = newViruses.filter(v => !hitVirusIds.has(v.id));
      const hits = hitVirusIds.size;
      
      if(hits > 0) {
        setScore(s => s + hits * 10);
      }
      
      setBubbles(remainingBubbles);
      setViruses(remainingViruses);
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    if (gameState === 'playing') {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, isFiring, bubbles, viruses, cannonAngle, virusSpawnRate]);

  useEffect(() => {
      if (virusesMissed >= MAX_VIRUSES_MISSED && gameState === 'playing') {
          handleGameOver();
      }
  }, [virusesMissed, gameState, handleGameOver])


  return (
    <div className="flex flex-col items-center justify-center font-headline w-full h-full">
      <h1 className="text-4xl md:text-6xl font-bold tracking-widest text-primary mb-4">VIRUS BUSTER</h1>
      <div className="flex justify-between w-full max-w-lg mb-2 text-xl text-accent">
        <h2>SCORE: {score}</h2>
        <h2>HI-SCORE: {highScore}</h2>
      </div>

      <div
        ref={gameAreaRef}
        className="relative bg-background border-4 border-primary/50 overflow-hidden touch-none scanlines"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <AnimatePresence>
          {gameState === 'gameOver' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center"
            >
              <h2 className="text-5xl text-destructive font-bold mb-4">GAME OVER</h2>
              <Button onClick={resetGame} variant="secondary" size="lg">
                <RefreshCw className="mr-2" />
                Play Again
              </Button>
            </motion.div>
          )}
           {gameState === 'ready' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center text-center p-4"
            >
              <h2 className="text-4xl text-accent font-bold mb-4">HOW TO PLAY</h2>
              <p className="text-lg text-primary mb-2">Aim: Mouse / Finger</p>
              <p className="text-lg text-primary mb-6">Shoot: Hold Click / Tap or Spacebar</p>
              <p className="text-lg text-destructive mb-6">Don't let {MAX_VIRUSES_MISSED} viruses reach the bottom!</p>
              <Button onClick={() => setGameState('playing')} variant="secondary" size="lg">
                Start Game
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Render Viruses */}
        <AnimatePresence>
            {viruses.map(virus => (
                 <motion.div
                    key={virus.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute rounded-full"
                    style={{
                        width: VIRUS_DIAMETER,
                        height: VIRUS_DIAMETER,
                        backgroundColor: virus.color,
                        left: virus.x,
                        top: virus.y,
                        boxShadow: `inset 0 0 5px rgba(0,0,0,0.5), 0 0 5px ${virus.color}`,
                        border: '2px solid rgba(255,255,255,0.3)'
                    }}
                 />
            ))}
        </AnimatePresence>
        
        {/* Render Bubbles */}
        {bubbles.map(bubble => (
            <div
                key={bubble.id}
                className="absolute rounded-full bg-primary/50"
                style={{
                    width: BUBBLE_DIAMETER,
                    height: BUBBLE_DIAMETER,
                    backgroundColor: 'hsl(var(--primary))',
                    left: bubble.x - BUBBLE_DIAMETER/2,
                    top: bubble.y - BUBBLE_DIAMETER/2,
                    boxShadow: `inset 0 0 3px rgba(255,255,255,0.5), 0 0 8px hsl(var(--primary))`,
                    border: '2px solid hsl(var(--primary-foreground))',
                    zIndex: 10
                }}
            />
        ))}
        
        {/* Cannon */}
        <div 
          className="absolute"
          style={{
            left: `50%`,
            bottom: 0,
            width: BUBBLE_DIAMETER * 1.5,
            height: BUBBLE_DIAMETER * 3,
            transformOrigin: '50% 100%',
            transform: `translateX(-50%) rotate(${cannonAngle}deg)`,
          }}
        >
          <div className="w-full h-full bg-primary/80 rounded-t-md border-2 border-primary" />
        </div>
      </div>
       <div className="text-center mt-4 text-destructive w-full max-w-lg">
          <p>Viruses Missed: {virusesMissed} / {MAX_VIRUSES_MISSED}</p>
       </div>
    </div>
  );
}
