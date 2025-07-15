"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// --- GAME CONSTANTS ---
const BUBBLE_COLORS = ['#FF4136', '#0074D9', '#2ECC40', '#FFDC00', '#B10DC9']; // Red, Blue, Green, Yellow, Purple
const GRID_COLS = 13;
const GRID_ROWS = 15;
const BUBBLE_DIAMETER = 36;
const PROJECTILE_SPEED = 15;
const ADVANCE_SHOT_COUNT = 5;
const GAME_OVER_ROW = 12;

// --- TYPES ---
type Bubble = {
  id: string;
  color: string;
  row: number;
  col: number;
  isPopping?: boolean;
};

type Projectile = {
  x: number;
  y: number;
  color: string;
  dx: number;
  dy: number;
};

type GameState = 'ready' | 'playing' | 'gameOver';

// --- HELPER FUNCTIONS ---
const getBubbleXY = (row: number, col: number) => {
  const x = col * BUBBLE_DIAMETER + (row % 2) * (BUBBLE_DIAMETER / 2);
  const y = row * (BUBBLE_DIAMETER * 0.866);
  return { x, y };
};

export function VirusBusterGame() {
  const [grid, setGrid] = useState<Map<string, Bubble>>(new Map());
  const [projectile, setProjectile] = useState<Projectile | null>(null);
  const [nextBubbleColor, setNextBubbleColor] = useState('');
  const [cannonAngle, setCannonAngle] = useState(0);
  const [gameState, setGameState] = useState<GameState>('ready');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [shotsUntilAdvance, setShotsUntilAdvance] = useState(ADVANCE_SHOT_COUNT);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  const getAvailableColors = useCallback(() => {
    const colorsInGrid = new Set(Array.from(grid.values()).map(b => b.color));
    return colorsInGrid.size > 0 ? Array.from(colorsInGrid) : BUBBLE_COLORS;
  }, [grid]);

  const resetBubbles = useCallback(() => {
    const newGrid = new Map<string, Bubble>();
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < GRID_COLS - (row % 2); col++) {
        const color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
        const id = `${row}-${col}`;
        newGrid.set(id, { id, color, row, col });
      }
    }
    setGrid(newGrid);
    setNextBubbleColor(BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)]);
  }, []);
  
  const resetGame = useCallback(() => {
    resetBubbles();
    setScore(0);
    setGameState('ready');
    setProjectile(null);
    setShotsUntilAdvance(ADVANCE_SHOT_COUNT);
    setCannonAngle(0);
  }, [resetBubbles]);

  useEffect(() => {
    const storedHighScore = localStorage.getItem('virusBusterHighScore');
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10));
    }
    resetGame();
  }, [resetGame]);
  
  const handleGameOver = useCallback(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('virusBusterHighScore', score.toString());
    }
    setGameState('gameOver');
  }, [score, highScore]);


  const findMatches = useCallback((startBubble: Bubble) => {
    const toCheck = [startBubble];
    const checked = new Set<string>();
    const matches = [];

    while (toCheck.length > 0) {
      const current = toCheck.pop()!;
      if (checked.has(current.id) || current.color !== startBubble.color) continue;
      
      checked.add(current.id);
      matches.push(current);

      const neighbors = getNeighbors(current.row, current.col);
      for (const neighborId of neighbors) {
        if (grid.has(neighborId) && !checked.has(neighborId)) {
          toCheck.push(grid.get(neighborId)!);
        }
      }
    }
    return matches;
  }, [grid]);

  const popBubbles = useCallback((bubblesToPop: Bubble[]) => {
    const newGrid = new Map(grid);
    let popCount = 0;
    
    bubblesToPop.forEach(bubble => {
      const bubbleInGrid = newGrid.get(bubble.id);
      if(bubbleInGrid){
        newGrid.set(bubble.id, { ...bubbleInGrid, isPopping: true });
        popCount++;
      }
    });

    setGrid(newGrid);
    setScore(s => s + popCount * 10);
    
    setTimeout(() => {
      const gridAfterPop = new Map(newGrid);
      bubblesToPop.forEach(bubble => gridAfterPop.delete(bubble.id));
      setGrid(gridAfterPop);
      
      // Check for floating bubbles after the pop animation
      const floating = findFloatingBubbles(gridAfterPop);
      if(floating.length > 0) {
        popBubbles(floating);
        setScore(s => s + floating.length * 20); // Bonus for dropping
      }

    }, 300);
  }, [grid]);

  const findFloatingBubbles = (currentGrid: Map<string, Bubble>) => {
      const connected = new Set<string>();
      const toCheck = [];

      for(let c = 0; c < GRID_COLS; c++){
          const id = `0-${c}`;
          if(currentGrid.has(id)) toCheck.push(currentGrid.get(id)!);
      }

      while(toCheck.length > 0) {
          const bubble = toCheck.pop()!;
          if(connected.has(bubble.id)) continue;
          connected.add(bubble.id);
          const neighbors = getNeighbors(bubble.row, bubble.col);
          for(const neighborId of neighbors){
              if(currentGrid.has(neighborId) && !connected.has(neighborId)){
                  toCheck.push(currentGrid.get(neighborId)!);
              }
          }
      }

      const floating: Bubble[] = [];
      for(const bubble of currentGrid.values()){
          if(!connected.has(bubble.id)){
              floating.push(bubble);
          }
      }
      return floating;
  }
  
  const getNeighbors = (row: number, col: number) => {
    const isOddRow = row % 2 === 1;
    const neighborCoords = [
      { r: row, c: col - 1 }, { r: row, c: col + 1 }, // left, right
      { r: row - 1, c: col + (isOddRow ? 0 : -1) }, { r: row - 1, c: col + (isOddRow ? 1 : 0) }, // top-left, top-right
      { r: row + 1, c: col + (isOddRow ? 0 : -1) }, { r: row + 1, c: col + (isOddRow ? 1 : 0) }, // bottom-left, bottom-right
    ];
    return neighborCoords
      .filter(c => c.c >= 0 && c.c < GRID_COLS - (c.r % 2))
      .map(c => `${c.r}-${c.c}`);
  };

  const advanceViruses = useCallback(() => {
    const newGrid = new Map<string, Bubble>();
    let isGameOver = false;

    grid.forEach(bubble => {
      const newRow = bubble.row + 1;
      if (newRow >= GAME_OVER_ROW) isGameOver = true;
      const newId = `${newRow}-${bubble.col}`;
      newGrid.set(newId, { ...bubble, row: newRow, id: newId });
    });

    for (let col = 0; col < GRID_COLS; col++) {
      const color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
      const id = `0-${col}`;
      newGrid.set(id, { id, color, row: 0, col });
    }

    setGrid(newGrid);
    if (isGameOver) handleGameOver();
  }, [grid, handleGameOver]);

  const handleShoot = useCallback(() => {
    if (gameState !== 'playing' || projectile) return;

    const angleRad = (cannonAngle - 90) * (Math.PI / 180);
    setProjectile({
      x: (GRID_COLS * BUBBLE_DIAMETER) / 2,
      y: GRID_ROWS * BUBBLE_DIAMETER * 0.866,
      color: nextBubbleColor,
      dx: Math.cos(angleRad) * PROJECTILE_SPEED,
      dy: Math.sin(angleRad) * PROJECTILE_SPEED,
    });
    const availableColors = getAvailableColors();
    setNextBubbleColor(availableColors[Math.floor(Math.random() * availableColors.length)]);
    setShotsUntilAdvance(s => s - 1);
  }, [gameState, projectile, cannonAngle, nextBubbleColor, getAvailableColors]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const gameX = e.clientX - rect.left;
    const cannonX = rect.width / 2;
    const cannonY = rect.height;
    const angleRad = Math.atan2(e.clientY - rect.top - cannonY, gameX - cannonX);
    let angleDeg = angleRad * (180 / Math.PI) + 90;
    if (angleDeg < -80) angleDeg = -80;
    if (angleDeg > 80) angleDeg = 80;
    setCannonAngle(angleDeg);
  };
  
  const handlePointerClick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState === 'ready') {
      setGameState('playing');
    } else if (gameState === 'playing') {
      handleShoot();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowLeft') setCannonAngle(a => Math.max(-80, a - 5));
      if (e.key === 'ArrowRight') setCannonAngle(a => Math.min(80, a + 5));
      if (e.key === ' ') {
        e.preventDefault();
        handleShoot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleShoot]);

  useEffect(() => {
    if (shotsUntilAdvance > 0) return;
    setShotsUntilAdvance(ADVANCE_SHOT_COUNT);
    advanceViruses();
  }, [shotsUntilAdvance, advanceViruses]);

  useEffect(() => {
    const gameLoop = () => {
      if (!projectile) return;
      
      let newX = projectile.x + projectile.dx;
      let newY = projectile.y + projectile.dy;
      let newDx = projectile.dx;

      const gameWidth = GRID_COLS * BUBBLE_DIAMETER;
      if (newX < BUBBLE_DIAMETER/2 || newX > gameWidth - BUBBLE_DIAMETER/2) {
        newDx = -newDx;
        newX = projectile.x + newDx;
      }
      
      let stuck = false;
      if (newY <= BUBBLE_DIAMETER/2) {
          stuck = true;
      }

      // Collision detection with grid bubbles
      for (const bubble of grid.values()) {
        const { x: bx, y: by } = getBubbleXY(bubble.row, bubble.col);
        const dist = Math.sqrt(Math.pow(newX - (bx + BUBBLE_DIAMETER/2), 2) + Math.pow(newY - (by + BUBBLE_DIAMETER/2), 2));
        if (dist < BUBBLE_DIAMETER) {
          stuck = true;
          break;
        }
      }

      if (stuck) {
        setProjectile(null);
        
        // Snap to grid
        const row = Math.round(newY / (BUBBLE_DIAMETER * 0.866));
        const col = Math.round((newX - (row % 2) * (BUBBLE_DIAMETER / 2)) / BUBBLE_DIAMETER);
        const newId = `${row}-${col}`;
        
        if (!grid.has(newId) && col >= 0 && col < GRID_COLS - (row%2) && row >= 0) {
          const newBubble: Bubble = { id: newId, color: projectile.color, row, col };
          const newGrid = new Map(grid).set(newId, newBubble);
          setGrid(newGrid);

          if (row >= GAME_OVER_ROW) {
            handleGameOver();
            return;
          }

          const matches = findMatches(newBubble);
          if (matches.length >= 3) {
            popBubbles(matches);
          }
        }
      } else {
        setProjectile(p => p ? {...p, x: newX, y: newY, dx: newDx} : null);
      }
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    if (projectile) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [projectile, grid, findMatches, popBubbles, handleGameOver]);


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
        style={{ width: GRID_COLS * BUBBLE_DIAMETER, height: GRID_ROWS * BUBBLE_DIAMETER * 0.866 }}
        onPointerMove={handlePointerMove}
        onClick={handlePointerClick}
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
              <p className="text-lg text-primary mb-2">Aim: Mouse / Finger / Arrow Keys</p>
              <p className="text-lg text-primary mb-6">Shoot: Click / Tap / Spacebar</p>
              <Button onClick={() => setGameState('playing')} variant="secondary" size="lg">
                Start Game
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {Array.from(grid.values()).map(bubble => {
            const { x, y } = getBubbleXY(bubble.row, bubble.col);
            return (
              <motion.div
                key={bubble.id}
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                    scale: bubble.isPopping ? [1, 1.2, 0] : 1, 
                    opacity: bubble.isPopping ? [1, 1, 0] : 1
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute w-full h-full rounded-full"
                style={{
                  width: BUBBLE_DIAMETER,
                  height: BUBBLE_DIAMETER,
                  backgroundColor: bubble.color,
                  left: x,
                  top: y,
                  boxShadow: `inset 0 0 5px rgba(0,0,0,0.5), 0 0 5px ${bubble.color}`,
                  border: '2px solid rgba(255,255,255,0.3)'
                }}
              />
            );
          })}
        </AnimatePresence>
        
        {projectile && (
            <div
                className="absolute w-full h-full rounded-full"
                style={{
                    width: BUBBLE_DIAMETER,
                    height: BUBBLE_DIAMETER,
                    backgroundColor: projectile.color,
                    left: projectile.x - BUBBLE_DIAMETER/2,
                    top: projectile.y - BUBBLE_DIAMETER/2,
                    boxShadow: `inset 0 0 5px rgba(0,0,0,0.5), 0 0 5px ${projectile.color}`,
                    border: '2px solid rgba(255,255,255,0.3)',
                    zIndex: 10
                }}
            />
        )}
        
        {/* Cannon */}
        <div 
          className="absolute bottom-0"
          style={{
            left: `calc(50% - ${BUBBLE_DIAMETER / 2}px)`,
            width: BUBBLE_DIAMETER,
            height: BUBBLE_DIAMETER * 2,
            transformOrigin: '50% 100%',
            transform: `translateX(-50%) rotate(${cannonAngle}deg)`,
            left: '50%'
          }}
        >
          <div className="w-full h-full bg-primary/80 rounded-t-md border-2 border-primary" />
          {gameState === 'playing' && !projectile && nextBubbleColor && (
              <div
                  className="absolute bottom-0 left-0 w-full h-auto rounded-full"
                  style={{
                      width: BUBble_DIAMETER,
                      height: BUBBLE_DIAMETER,
                      backgroundColor: nextBubbleColor,
                      boxShadow: `inset 0 0 5px rgba(0,0,0,0.5), 0 0 5px ${nextBubbleColor}`,
                      border: '2px solid rgba(255,255,255,0.3)'
                  }}
              />
          )}
        </div>
      </div>
       <div className="text-center mt-4 text-muted-foreground w-full max-w-lg">
          <p>Viruses advance in: {shotsUntilAdvance} shots</p>
       </div>
    </div>
  );
}
