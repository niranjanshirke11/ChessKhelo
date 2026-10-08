// Stockfish WebAssembly service
// Loads from CDN, communicates via UCI protocol

export interface EvalResult {
  score: number;      // centipawns (positive = white winning)
  mate: number | null; // moves to mate, null if no mate
  bestMove: string;   // UCI move e.g. "e2e4"
  depth: number;
}

type EvalCallback = (result: EvalResult) => void;

class StockfishService {
  private worker: Worker | null = null;
  private ready = false;
  private queue: Array<{ fen: string; depth: number; cb: EvalCallback }> = [];
  private currentCb: EvalCallback | null = null;
  private buffer: string[] = [];
  private skillLevel = 10;

  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ready) { resolve(); return; }
      try {
        // Load Stockfish from CDN via blob worker trick
        const script = `importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');`;
        const blob = new Blob([script], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        this.worker = new Worker(url);

        this.worker.onmessage = (e: MessageEvent) => {
          const line: string = e.data;
          this.handleMessage(line);
        };

        this.worker.onerror = () => {
          // Fallback: try direct worker URL
          this.worker = new Worker('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');
          this.worker.onmessage = (e: MessageEvent) => this.handleMessage(e.data);
          this.worker.onerror = reject;
          this.send('uci');
        };

        this.send('uci');

        const timeout = setTimeout(() => {
          this.ready = true;
          resolve();
        }, 3000);

        const origHandle = this.handleMessage.bind(this);
        this.handleMessage = (line: string) => {
          if (line === 'uciok') {
            clearTimeout(timeout);
            this.ready = true;
            this.send('isready');
          }
          if (line === 'readyok') {
            this.send(`setoption name Skill Level value ${this.skillLevel}`);
            resolve();
          }
          origHandle(line);
        };

      } catch (err) {
        reject(err);
      }
    });
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  private handleMessage(line: string) {
    if (!this.currentCb) return;

    // Parse bestmove
    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const bestMove = parts[1] || '';

      // Parse last info line for score
      let score = 0;
      let mate: number | null = null;
      let depth = 1;

      for (const infoLine of this.buffer.reverse()) {
        if (infoLine.startsWith('info') && infoLine.includes('score')) {
          const mateMatch = infoLine.match(/score mate (-?\d+)/);
          const cpMatch   = infoLine.match(/score cp (-?\d+)/);
          const depthMatch = infoLine.match(/depth (\d+)/);

          if (mateMatch) mate = parseInt(mateMatch[1]);
          if (cpMatch)   score = parseInt(cpMatch[1]) / 100;
          if (depthMatch) depth = parseInt(depthMatch[1]);
          break;
        }
      }

      this.buffer = [];
      const cb = this.currentCb;
      this.currentCb = null;
      cb({ score, mate, bestMove, depth });

      // Process next in queue
      if (this.queue.length > 0) {
        const next = this.queue.shift()!;
        this._evaluate(next.fen, next.depth, next.cb);
      }
      return;
    }

    if (line.startsWith('info')) {
      this.buffer.push(line);
    }
  }

  private _evaluate(fen: string, depth: number, cb: EvalCallback) {
    this.currentCb = cb;
    this.buffer = [];
    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}`);
  }

  setSkillLevel(level: number) {
    // level: 0-20 (Stockfish skill), map our 1-8 to 0-20
    this.skillLevel = level;
    this.send(`setoption name Skill Level value ${level}`);
  }

  evaluate(fen: string, depth: number, cb: EvalCallback) {
    if (this.currentCb) {
      // Cancel current, add to queue
      this.queue = [{ fen, depth, cb }]; // only keep latest
      this.send('stop');
    } else {
      this._evaluate(fen, depth, cb);
    }
  }

  getBestMove(fen: string, depth: number): Promise<EvalResult> {
    return new Promise((resolve) => {
      this.evaluate(fen, depth, resolve);
    });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }
}

// Singleton
let instance: StockfishService | null = null;

export function getStockfish(): StockfishService {
  if (!instance) instance = new StockfishService();
  return instance;
}

// Difficulty config
export const DIFFICULTY_LEVELS = [
  { level: 1, label: 'Beginner',     skill: 0,  depth: 1, elo: 600  },
  { level: 2, label: 'Novice',       skill: 2,  depth: 2, elo: 800  },
  { level: 3, label: 'Casual',       skill: 5,  depth: 3, elo: 1000 },
  { level: 4, label: 'Intermediate', skill: 8,  depth: 4, elo: 1200 },
  { level: 5, label: 'Advanced',     skill: 12, depth: 5, elo: 1600 },
  { level: 6, label: 'Expert',       skill: 15, depth: 6, elo: 1900 },
  { level: 7, label: 'Master',       skill: 18, depth: 7, elo: 2300 },
  { level: 8, label: 'Grandmaster',  skill: 20, depth: 8, elo: 2700 },
];
