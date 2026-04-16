import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  RotateCcw,
  Trophy,
  PencilLine,
  BookOpen,
  CheckCircle2,
  ArrowDown,
  Wand2,
  Star,
  Brain,
  ScanSearch,
} from "lucide-react";

const GRID_SIZE = 17;
const MAX_TRIES = 600;
const SIZE_OPTIONS = [10, 15, 20];

const emptyEntry = () => ({ word: "", clue: "", example: "" });

const BUILTIN_HINTS = {
  ALGORITHM: {
    clue: "A step-by-step method for solving a problem or completing a task.",
  },
  PYTHON: {
    clue: "A popular programming language known for readability and flexibility.",
  },
  NETWORK: {
    clue: "A connected system of devices, people, or points that exchange information.",
  },
  MEMORY: {
    clue: "The ability or place to store and recall information.",
  },
  KERNEL: {
    clue: "The core part of an operating system that manages essential system operations.",
  },
  VECTOR: {
    clue: "A quantity or representation that has direction, magnitude, or ordered values.",
  },
  MODULE: {
    clue: "A self-contained part of a larger system or program.",
  },
  BINARY: {
    clue: "A base-2 system that uses only two states, often 0 and 1.",
  },
  CIPHER: {
    clue: "A method or system for encoding information secretly.",
  },
  SCRIPT: {
    clue: "A text file or set of commands used to automate actions.",
  },
  SIGNAL: {
    clue: "A message, indicator, or transmitted pattern carrying information.",
  },
  MATRIX: {
    clue: "A rectangular arrangement of values organized into rows and columns.",
  },
  PACKET: {
    clue: "A formatted unit of data sent across a network.",
  },
  BUFFER: {
    clue: "A temporary storage area used while data is being processed or moved.",
  },
  THREAD: {
    clue: "A sequence of execution inside a running program.",
  },
  OBJECT: {
    clue: "An instance that contains data and behavior in programming.",
  },
  SCHEMA: {
    clue: "A structured description or blueprint for organizing data.",
  },
  ROUTER: {
    clue: "A device or logic unit that directs traffic to the correct destination.",
  },
  LATENCY: {
    clue: "The delay before a system responds or data begins to move.",
  },
  QUORUM: {
    clue: "The minimum required participation needed for a valid decision.",
  },
};

const normalizeWord = (s) =>
  (s || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

const createEntries = (n) => Array.from({ length: n }, () => emptyEntry());

function createEmptyGrid(size = GRID_SIZE) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function canPlaceWord(grid, word, row, col, dir) {
  const dr = dir === "across" ? 0 : 1;
  const dc = dir === "across" ? 1 : 0;
  const size = grid.length;

  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || c < 0 || r >= size || c >= size) return false;
    const existing = grid[r][c];
    if (existing && existing !== word[i]) return false;

    if (!existing) {
      if (dir === "across") {
        if (r > 0 && grid[r - 1][c]) return false;
        if (r < size - 1 && grid[r + 1][c]) return false;
      } else {
        if (c > 0 && grid[r][c - 1]) return false;
        if (c < size - 1 && grid[r][c + 1]) return false;
      }
    }
  }

  const beforeR = row - dr;
  const beforeC = col - dc;
  const afterR = row + dr * word.length;
  const afterC = col + dc * word.length;

  if (beforeR >= 0 && beforeC >= 0 && beforeR < size && beforeC < size && grid[beforeR][beforeC]) {
    return false;
  }
  if (afterR >= 0 && afterC >= 0 && afterR < size && afterC < size && grid[afterR][afterC]) {
    return false;
  }

  return true;
}

function placeWord(grid, word, row, col, dir) {
  const newGrid = cloneGrid(grid);
  const dr = dir === "across" ? 0 : 1;
  const dc = dir === "across" ? 1 : 0;
  for (let i = 0; i < word.length; i++) {
    newGrid[row + dr * i][col + dc * i] = word[i];
  }
  return newGrid;
}

function scorePlacement(grid, word, row, col, dir) {
  const dr = dir === "across" ? 0 : 1;
  const dc = dir === "across" ? 1 : 0;
  let intersections = 0;
  let touchesCenter = 0;
  const center = Math.floor(grid.length / 2);

  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (grid[r][c] === word[i]) intersections += 1;
    const dist = Math.abs(r - center) + Math.abs(c - center);
    touchesCenter += Math.max(0, 8 - dist);
  }

  return intersections * 12 + touchesCenter;
}

function findBestPlacement(grid, word, placedWords) {
  const size = grid.length;
  const candidates = [];

  if (placedWords.length === 0) {
    const row = Math.floor(size / 2);
    const col = Math.floor((size - word.length) / 2);
    if (canPlaceWord(grid, word, row, col, "across")) {
      return { row, col, dir: "across", score: 999 };
    }
    return null;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const dir of ["across", "down"]) {
        if (!canPlaceWord(grid, word, r, c, dir)) continue;
        const score = scorePlacement(grid, word, r, c, dir);
        if (score > 0) candidates.push({ row: r, col: c, dir, score });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

function trimGrid(grid, placements) {
  const coords = [];
  placements.forEach((p) => {
    const dr = p.dir === "across" ? 0 : 1;
    const dc = p.dir === "across" ? 1 : 0;
    for (let i = 0; i < p.word.length; i++) {
      coords.push([p.row + dr * i, p.col + dc * i]);
    }
  });

  const rows = coords.map(([r]) => r);
  const cols = coords.map(([, c]) => c);
  const minR = Math.max(0, Math.min(...rows) - 1);
  const maxR = Math.min(grid.length - 1, Math.max(...rows) + 1);
  const minC = Math.max(0, Math.min(...cols) - 1);
  const maxC = Math.min(grid.length - 1, Math.max(...cols) + 1);

  const trimmed = [];
  for (let r = minR; r <= maxR; r++) {
    trimmed.push(grid[r].slice(minC, maxC + 1));
  }

  const shifted = placements.map((p) => ({
    ...p,
    row: p.row - minR,
    col: p.col - minC,
  }));

  return { grid: trimmed, placements: shifted };
}

function assignNumbers(grid, placements) {
  const starts = new Map();
  let count = 1;

  const sorted = [...placements].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  sorted.forEach((p) => {
    const key = `${p.row},${p.col}`;
    if (!starts.has(key)) starts.set(key, count++);
    p.number = starts.get(key);
  });

  const numberedGrid = grid.map((row, r) =>
    row.map((cell, c) => ({
      letter: cell,
      number: starts.get(`${r},${c}`) || null,
    }))
  );

  return { placements: sorted, numberedGrid };
}

function maskExampleSentence(example, word) {
  const cleanExample = (example || "").trim();
  const cleanWord = normalizeWord(word);
  if (!cleanExample) return "";
  if (!cleanWord) return cleanExample;

  const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "gi");
  const replaced = cleanExample.replace(regex, "_____ ");
  return replaced.replace(/\s+/g, " ").trim();
}

function resolveHint(entry) {
  const word = normalizeWord(entry.word);
  const manualClue = (entry.clue || "").trim();
  const maskedExample = maskExampleSentence(entry.example, word);

  if (BUILTIN_HINTS[word]) {
    return {
      clue: manualClue || BUILTIN_HINTS[word].clue,
      example: maskedExample,
      source: manualClue ? "mixed" : "builtin",
    };
  }

  return {
    clue: manualClue,
    example: maskedExample,
    source: "manual",
  };
}

function generateCrossword(rawEntries) {
  const entries = rawEntries
    .map((e, idx) => {
      const word = normalizeWord(e.word);
      const resolved = resolveHint(e);
      return {
        id: idx + 1,
        word,
        clue: resolved.clue,
        example: resolved.example,
        clueSource: resolved.source,
      };
    })
    .filter((e) => e.word.length >= 3 && e.clue)
    .sort((a, b) => b.word.length - a.word.length);

  if (entries.length < 3) {
    return { error: "Please add at least 3 valid words, each with a short English clue ✨" };
  }

  let best = null;

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const grid = createEmptyGrid();
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    shuffled.sort((a, b) => b.word.length - a.word.length + (Math.random() - 0.5));

    let working = grid;
    const placements = [];

    for (const entry of shuffled) {
      const candidate = findBestPlacement(working, entry.word, placements);
      if (!candidate) continue;
      working = placeWord(working, entry.word, candidate.row, candidate.col, candidate.dir);
      placements.push({ ...entry, ...candidate });
    }

    if (!best || placements.length > best.placements.length) {
      best = { grid: working, placements };
      if (placements.length === entries.length) break;
    }
  }

  if (!best || best.placements.length < Math.max(3, Math.floor(entries.length * 0.6))) {
    return { error: "I couldn't build a nice crossword from those words. Try words that share more letters like A, E, R, T, N, I ✨" };
  }

  const trimmed = trimGrid(best.grid, best.placements);
  const numbered = assignNumbers(trimmed.grid, trimmed.placements);

  const userGrid = numbered.numberedGrid.map((row) =>
    row.map((cell) => (cell.letter ? "" : null))
  );

  return {
    grid: numbered.numberedGrid,
    placements: numbered.placements,
    userGrid,
    totalWords: numbered.placements.length,
  };
}

function getCellOwners(placements, row, col) {
  return placements.filter((p) => {
    if (p.dir === "across") {
      return row === p.row && col >= p.col && col < p.col + p.word.length;
    }
    return col === p.col && row >= p.row && row < p.row + p.word.length;
  });
}

function evaluatePuzzle(data, userGrid) {
  let totalLetters = 0;
  let correctLetters = 0;
  let solvedWords = 0;

  data.placements.forEach((p) => {
    let ok = true;
    for (let i = 0; i < p.word.length; i++) {
      const r = p.row + (p.dir === "down" ? i : 0);
      const c = p.col + (p.dir === "across" ? i : 0);
      totalLetters += 1;
      if ((userGrid[r][c] || "").toUpperCase() === p.word[i]) {
        correctLetters += 1;
      } else {
        ok = false;
      }
    }
    if (ok) solvedWords += 1;
  });

  const letterRate = totalLetters ? Math.round((correctLetters / totalLetters) * 100) : 0;
  const wordRate = data.placements.length ? Math.round((solvedWords / data.placements.length) * 100) : 0;
  const score = Math.round(letterRate * 0.7 + wordRate * 0.3);

  return { totalLetters, correctLetters, solvedWords, letterRate, wordRate, score };
}

function complimentForScore(score) {
  if (score === 100) {
    return {
      title: "Legendary crossword sorcerer! 👑✨",
      body: "Perfect solve. That was sharp, elegant, and very dangerous to all future puzzles.",
    };
  }
  if (score >= 85) {
    return {
      title: "Brilliant work! 🌟",
      body: "That was seriously strong. Your pattern recognition game is glowing.",
    };
  }
  if (score >= 65) {
    return {
      title: "Very impressive 🧠",
      body: "You were close to total domination. The grid definitely felt the pressure.",
    };
  }
  if (score >= 40) {
    return {
      title: "Nice fight! 💪",
      body: "Good progress. You found meaningful structure and pushed the board forward.",
    };
  }
  return {
    title: "Promising start 🌱",
    body: "Crosswords love patience. You are already mapping the puzzle’s hidden logic.",
  };
}

export default function InteractiveCrosswordBuilderGame() {
  const [wordCount, setWordCount] = useState("10");
  const [entries, setEntries] = useState(createEntries(10));
  const [puzzle, setPuzzle] = useState(null);
  const [message, setMessage] = useState("Type your words and short English meanings. Optional example sentences can be added only if you want 😎");
  const [selectedCell, setSelectedCell] = useState(null);
  const [activeDirection, setActiveDirection] = useState("across");
  const [result, setResult] = useState(null);
  const cellRefs = useRef({});

  useEffect(() => {
    const n = Number(wordCount);
    setEntries((prev) => {
      const next = createEntries(n);
      for (let i = 0; i < Math.min(prev.length, n); i++) next[i] = prev[i];
      return next;
    });
    setPuzzle(null);
    setResult(null);
    setSelectedCell(null);
  }, [wordCount]);

  useEffect(() => {
    if (!selectedCell) return;
    const key = `${selectedCell.row}-${selectedCell.col}`;
    const el = cellRefs.current[key];
    if (el) el.focus();
  }, [selectedCell, puzzle?.userGrid]);

  const activeCellOwners = useMemo(() => {
    if (!puzzle || !selectedCell) return [];
    return getCellOwners(puzzle.placements, selectedCell.row, selectedCell.col);
  }, [puzzle, selectedCell]);

  const highlightedWord = useMemo(() => {
    if (!activeCellOwners.length) return null;
    return activeCellOwners.find((w) => w.dir === activeDirection) || activeCellOwners[0];
  }, [activeCellOwners, activeDirection]);

  function updateEntry(idx, field, value) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  }

  function loadDemo() {
    const demo = [
      ["ALGORITHM", "A step-by-step procedure for solving a problem", "The _____ selected the fastest route through the graph."],
      ["PYTHON", "A popular programming language", "She used _____ to automate the data-cleaning task."],
      ["NETWORK", "Connected systems that exchange data", "The office _____ became slow during the update."],
      ["MEMORY", "Stored information used later", "Good _____ helps you recall facts during exams."],
      ["KERNEL", "The core part of an operating system", "The operating system _____ manages essential low-level tasks."],
      ["VECTOR", "A quantity with magnitude and direction", "In geometry, a _____ can represent movement in space."],
      ["MODULE", "A self-contained software component", "We replaced one _____ without changing the whole system."],
      ["BINARY", "Base-2 representation using 0 and 1", "Computers store data in _____ form."],
      ["CIPHER", "A method for encrypting information", "The secret message was protected by a _____."],
      ["SCRIPT", "A file containing executable commands", "He ran a _____ to install every dependency."],
      ["SIGNAL", "A detectable message or indication", "The sensor sent a warning _____ to the controller."],
      ["MATRIX", "A rectangular array of values", "The numbers were stored in a 3 by 3 _____."],
      ["PACKET", "A formatted unit of data sent over a network", "Each _____ carried part of the file across the internet."],
      ["BUFFER", "Temporary storage for data", "The app used a _____ to avoid playback interruptions."],
      ["THREAD", "A sequence of executable instructions", "A single busy _____ should not freeze the whole app."],
      ["OBJECT", "An instance containing data and behavior", "In object-oriented design, each _____ can hold its own state."],
      ["SCHEMA", "A structured description of data", "The database _____ defines each field clearly."],
      ["ROUTER", "A device or logic that forwards traffic", "The _____ sent the request to the correct destination."],
      ["LATENCY", "Delay before a transfer begins", "Gamers notice high _____ during online matches."],
      ["QUORUM", "Minimum required participation for a decision", "The committee could not vote without a _____ present."],
    ];
    const n = Number(wordCount);
    setEntries(demo.slice(0, n).map(([word, clue, example]) => ({ word, clue, example })));
    setPuzzle(null);
    setResult(null);
    setMessage("Demo set loaded. Build it and see the cleaner meaning-first clue cards 🪄");
  }

  function buildPuzzle() {
    const data = generateCrossword(entries);
    if (data.error) {
      setMessage(data.error);
      setPuzzle(null);
      setResult(null);
      return;
    }
    setPuzzle(data);
    setResult(null);
    const first = data.placements[0];
    setSelectedCell(first ? { row: first.row, col: first.col } : null);
    setMessage(`Crossword forged successfully with ${data.totalWords} words 🎉`);
  }

  function resetInputs() {
    setEntries(createEntries(Number(wordCount)));
    setPuzzle(null);
    setResult(null);
    setSelectedCell(null);
    setMessage("Fresh board, fresh meanings, fresh victory path ✨");
  }

  function focusCell(row, col) {
    setSelectedCell({ row, col });
  }

  function findNextFilledCell(r, c, direction, step = 1) {
    if (!puzzle) return null;
    const dr = direction === "down" ? 1 : 0;
    const dc = direction === "across" ? 1 : 0;
    let nr = r;
    let nc = c;

    for (let k = 0; k < 40; k++) {
      nr += dr * step;
      nc += dc * step;
      if (nr < 0 || nc < 0 || nr >= puzzle.grid.length || nc >= puzzle.grid[0].length) return null;
      if (puzzle.grid[nr][nc].letter) return { row: nr, col: nc };
    }
    return null;
  }

  function updateCell(r, c, value, shouldAdvance = false) {
    if (!puzzle || puzzle.grid[r][c].letter == null) return;
    const char = (value || "").toUpperCase().replace(/[^A-Z]/g, "").slice(-1);
    const next = puzzle.userGrid.map((row) => [...row]);
    next[r][c] = char;
    setPuzzle({ ...puzzle, userGrid: next });

    if (shouldAdvance && char) {
      const nextPos = findNextFilledCell(r, c, activeDirection, 1);
      if (nextPos) focusCell(nextPos.row, nextPos.col);
    }
  }

  function onCellKeyDown(e, r, c) {
    if (!puzzle) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      if (puzzle.userGrid[r][c]) {
        updateCell(r, c, "", false);
      } else {
        const prevPos = findNextFilledCell(r, c, activeDirection, -1);
        if (prevPos) focusCell(prevPos.row, prevPos.col);
      }
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActiveDirection("across");
      const nextPos = findNextFilledCell(r, c, "across", 1);
      if (nextPos) focusCell(nextPos.row, nextPos.col);
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveDirection("across");
      const prevPos = findNextFilledCell(r, c, "across", -1);
      if (prevPos) focusCell(prevPos.row, prevPos.col);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveDirection("down");
      const nextPos = findNextFilledCell(r, c, "down", 1);
      if (nextPos) focusCell(nextPos.row, nextPos.col);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveDirection("down");
      const prevPos = findNextFilledCell(r, c, "down", -1);
      if (prevPos) focusCell(prevPos.row, prevPos.col);
      return;
    }

    if (e.key === " ") {
      e.preventDefault();
      setActiveDirection((d) => (d === "across" ? "down" : "across"));
      return;
    }

    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      updateCell(r, c, e.key, true);
    }
  }

  function checkAnswers() {
    if (!puzzle) return;
    const stats = evaluatePuzzle(puzzle, puzzle.userGrid);
    setResult({ ...stats, ...complimentForScore(stats.score) });
    setMessage(`Checked! You got ${stats.correctLetters}/${stats.totalLetters} letters correct 🧩`);
  }

  function fillSolution() {
    if (!puzzle) return;
    const solved = puzzle.userGrid.map((row, r) =>
      row.map((cell, c) => (puzzle.grid[r][c].letter ? puzzle.grid[r][c].letter : null))
    );
    setPuzzle({ ...puzzle, userGrid: solved });
    const stats = evaluatePuzzle(puzzle, solved);
    setResult({ ...stats, ...complimentForScore(100), score: 100 });
    setMessage("Solution revealed. Absorb the word-meaning links and then destroy the next board 🏆");
  }

  const acrossWords = useMemo(
    () => (puzzle ? puzzle.placements.filter((p) => p.dir === "across") : []),
    [puzzle]
  );
  const downWords = useMemo(
    () => (puzzle ? puzzle.placements.filter((p) => p.dir === "down") : []),
    [puzzle]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"
        >
          <Card className="rounded-3xl border-0 shadow-xl">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
                    <Sparkles className="h-7 w-7" />
                    Interactive Crossword Forge
                  </CardTitle>
                  <p className="mt-2 text-sm text-slate-600 md:text-base">
                    This version keeps the puzzle focused on words and meanings. Example sentences are optional and only shown when the user provides them ✨
                  </p>
                </div>
                <Badge className="rounded-full px-4 py-2 text-sm">Puzzle Lab</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-700">Word count</div>
                  <Select value={wordCount} onValueChange={setWordCount}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Choose size" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} words</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-medium text-slate-800">How it works</div>
                  <div className="mt-1">
                    Users type a word and a short English meaning. Example sentences are optional. If an example is provided, the answer word is hidden inside the sentence so the clue stays fair.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={loadDemo} className="rounded-2xl">
                  <Wand2 className="mr-2 h-4 w-4" /> Load demo words
                </Button>
                <Button onClick={buildPuzzle} variant="secondary" className="rounded-2xl">
                  <BookOpen className="mr-2 h-4 w-4" /> Build crossword
                </Button>
                <Button onClick={resetInputs} variant="outline" className="rounded-2xl">
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset all
                </Button>
              </div>

              <div className="rounded-2xl border bg-white p-4 text-sm text-slate-700">
                {message}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border bg-white p-4">
                  <div className="flex items-center gap-2 font-semibold"><Brain className="h-4 w-4" /> Meaning-first</div>
                  <div className="mt-2 text-sm text-slate-600">The core input is still the word plus its short English meaning.</div>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <div className="flex items-center gap-2 font-semibold"><ScanSearch className="h-4 w-4" /> Optional example</div>
                  <div className="mt-2 text-sm text-slate-600">An example sentence is shown only if the user wants to add one.</div>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <div className="flex items-center gap-2 font-semibold"><ArrowDown className="h-4 w-4" /> Smooth solving</div>
                  <div className="mt-2 text-sm text-slate-600">Typing a letter automatically moves focus to the next valid cell.</div>
                </div>
              </div>

              <div className="max-h-[70vh] space-y-3 overflow-auto pr-1">
                {entries.map((entry, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[150px_1fr_1fr]"
                  >
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Word {idx + 1}
                      </div>
                      <Input
                        value={entry.word}
                        onChange={(e) => updateEntry(idx, "word", e.target.value)}
                        placeholder="e.g. PYTHON"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Short English meaning
                      </div>
                      <Textarea
                        value={entry.clue}
                        onChange={(e) => updateEntry(idx, "clue", e.target.value)}
                        placeholder="e.g. A popular programming language"
                        className="min-h-[76px] rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Optional example sentence
                      </div>
                      <Textarea
                        value={entry.example}
                        onChange={(e) => updateEntry(idx, "example", e.target.value)}
                        placeholder="e.g. She used Python to automate the task"
                        className="min-h-[76px] rounded-xl"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl border-0 shadow-xl">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-2xl">Solve the crossword</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      Direction: {activeDirection}
                    </Badge>
                    <Badge className="rounded-full px-3 py-1">Space = switch</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!puzzle ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                    Your puzzle will appear here after you build it ✨
                  </div>
                ) : (
                  <>
                    <div className="overflow-auto rounded-2xl bg-slate-50 p-3">
                      <div
                        className="mx-auto grid w-max gap-[2px] rounded-2xl bg-slate-300 p-[2px]"
                        style={{ gridTemplateColumns: `repeat(${puzzle.grid[0].length}, minmax(0, 42px))` }}
                      >
                        {puzzle.grid.map((row, r) =>
                          row.map((cell, c) => {
                            if (!cell.letter) {
                              return <div key={`${r}-${c}`} className="h-[42px] w-[42px] rounded-md bg-slate-900" />;
                            }

                            const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                            const inHighlightedWord = highlightedWord
                              ? getCellOwners([highlightedWord], r, c).length > 0
                              : false;

                            return (
                              <div key={`${r}-${c}`} className="relative h-[42px] w-[42px] bg-white">
                                {cell.number && (
                                  <div className="absolute left-1 top-0.5 text-[10px] font-bold text-slate-500">
                                    {cell.number}
                                  </div>
                                )}
                                <input
                                  ref={(el) => {
                                    cellRefs.current[`${r}-${c}`] = el;
                                  }}
                                  value={puzzle.userGrid[r][c] || ""}
                                  onChange={() => {}}
                                  onClick={() => {
                                    focusCell(r, c);
                                    const owners = getCellOwners(puzzle.placements, r, c);
                                    const hasCurrentDir = owners.some((w) => w.dir === activeDirection);
                                    if (!hasCurrentDir && owners[0]) setActiveDirection(owners[0].dir);
                                  }}
                                  onKeyDown={(e) => onCellKeyDown(e, r, c)}
                                  className={`h-full w-full rounded-none border-0 text-center text-lg font-bold uppercase outline-none transition ${
                                    isSelected
                                      ? "bg-amber-100 ring-2 ring-amber-400"
                                      : inHighlightedWord
                                      ? "bg-sky-50"
                                      : "bg-white"
                                  }`}
                                  maxLength={1}
                                />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button onClick={checkAnswers} className="rounded-2xl">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Check answers
                      </Button>
                      <Button onClick={fillSolution} variant="secondary" className="rounded-2xl">
                        <Star className="mr-2 h-4 w-4" /> Reveal solution
                      </Button>
                      <Button
                        onClick={() => {
                          const cleared = puzzle.userGrid.map((row) => row.map((cell) => (cell === null ? null : "")));
                          setPuzzle({ ...puzzle, userGrid: cleared });
                          setResult(null);
                          setMessage("Board cleared. Round two 😎");
                          const first = puzzle.placements[0];
                          if (first) focusCell(first.row, first.col);
                        }}
                        variant="outline"
                        className="rounded-2xl"
                      >
                        <PencilLine className="mr-2 h-4 w-4" /> Clear letters
                      </Button>
                    </div>

                    <AnimatePresence>
                      {result && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="rounded-3xl border bg-gradient-to-r from-amber-50 via-white to-sky-50 p-5"
                        >
                          <div className="flex items-start gap-3">
                            <Trophy className="mt-1 h-6 w-6" />
                            <div className="space-y-3">
                              <div>
                                <div className="text-xl font-bold">{result.title}</div>
                                <div className="text-slate-600">{result.body}</div>
                              </div>
                              <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-2xl bg-white p-3 shadow-sm">
                                  <div className="text-xs uppercase text-slate-500">Score</div>
                                  <div className="text-2xl font-bold">{result.score}%</div>
                                </div>
                                <div className="rounded-2xl bg-white p-3 shadow-sm">
                                  <div className="text-xs uppercase text-slate-500">Letters</div>
                                  <div className="text-2xl font-bold">{result.correctLetters}/{result.totalLetters}</div>
                                </div>
                                <div className="rounded-2xl bg-white p-3 shadow-sm">
                                  <div className="text-xs uppercase text-slate-500">Solved words</div>
                                  <div className="text-2xl font-bold">{result.solvedWords}/{puzzle.placements.length}</div>
                                </div>
                              </div>
                              <Progress value={result.score} className="h-3" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Clues</CardTitle>
              </CardHeader>
              <CardContent>
                {!puzzle ? (
                  <div className="text-slate-500">Clue cards will show here once the puzzle is generated.</div>
                ) : (
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <CheckCircle2 className="h-5 w-5" /> Across
                      </div>
                      {acrossWords.map((p) => {
                        const active = highlightedWord?.number === p.number && highlightedWord?.dir === p.dir;
                        return (
                          <div
                            key={`${p.number}-${p.dir}`}
                            className={`rounded-2xl border p-4 transition ${active ? "bg-amber-50 border-amber-300" : "bg-white"}`}
                            onClick={() => {
                              focusCell(p.row, p.col);
                              setActiveDirection(p.dir);
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-semibold">{p.number}. {p.clue}</div>
                              <Badge variant="secondary" className="rounded-full">
                                {p.clueSource === "manual" ? "manual clue" : p.clueSource === "mixed" ? "manual + smart" : "smart clue"}
                              </Badge>
                            </div>
                            {p.example ? (
                              <div className="mt-2 text-sm text-slate-600">Example: {p.example}</div>
                            ) : null}
                            <div className="mt-2 text-xs text-slate-500">Length: {p.word.length}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <ArrowDown className="h-5 w-5" /> Down
                      </div>
                      {downWords.map((p) => {
                        const active = highlightedWord?.number === p.number && highlightedWord?.dir === p.dir;
                        return (
                          <div
                            key={`${p.number}-${p.dir}`}
                            className={`rounded-2xl border p-4 transition ${active ? "bg-sky-50 border-sky-300" : "bg-white"}`}
                            onClick={() => {
                              focusCell(p.row, p.col);
                              setActiveDirection(p.dir);
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-semibold">{p.number}. {p.clue}</div>
                              <Badge variant="secondary" className="rounded-full">
                                {p.clueSource === "manual" ? "manual clue" : p.clueSource === "mixed" ? "manual + smart" : "smart clue"}
                              </Badge>
                            </div>
                            {p.example ? (
                              <div className="mt-2 text-sm text-slate-600">Example: {p.example}</div>
                            ) : null}
                            <div className="mt-2 text-xs text-slate-500">Length: {p.word.length}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
