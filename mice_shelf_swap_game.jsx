import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Undo2, Trophy, MousePointerClick } from "lucide-react";

const START = ["B", "B", "B", "B", "_", "S", "S", "S", "S"];
const GOAL = ["S", "S", "S", "S", "_", "B", "B", "B", "B"];
const MIN_MOVES = 24;

function cloneBoard(board) {
  return [...board];
}

function boardKey(board) {
  return board.join("");
}

function isGoal(board) {
  return boardKey(board) === boardKey(GOAL);
}

function getLegalMoves(board) {
  const moves = [];
  const empty = board.indexOf("_");

  for (let i = 0; i < board.length; i++) {
    const piece = board[i];
    if (piece === "_") continue;

    if (piece === "B") {
      if (i + 1 === empty) {
        moves.push({ from: i, to: empty, type: "step" });
      }
      if (i + 2 === empty && board[i + 1] !== "_") {
        moves.push({ from: i, to: empty, type: "jump" });
      }
    }

    if (piece === "S") {
      if (i - 1 === empty) {
        moves.push({ from: i, to: empty, type: "step" });
      }
      if (i - 2 === empty && board[i - 1] !== "_") {
        moves.push({ from: i, to: empty, type: "jump" });
      }
    }
  }

  return moves;
}

function applyMove(board, move) {
  const next = cloneBoard(board);
  next[move.to] = next[move.from];
  next[move.from] = "_";
  return next;
}

function bfsMinimumMoves(startBoard, goalBoard) {
  const target = boardKey(goalBoard);
  const startKey = boardKey(startBoard);
  const queue = [{ board: startBoard, dist: 0 }];
  const seen = new Set([startKey]);

  while (queue.length) {
    const { board, dist } = queue.shift();
    const key = boardKey(board);
    if (key === target) return dist;

    for (const move of getLegalMoves(board)) {
      const next = applyMove(board, move);
      const nextKey = boardKey(next);
      if (!seen.has(nextKey)) {
        seen.add(nextKey);
        queue.push({ board: next, dist: dist + 1 });
      }
    }
  }

  return null;
}

function Space({ value, index, onClick, isLegalFrom, isSelected }) {
  const isEmpty = value === "_";
  const isBrass = value === "B";
  const isSilver = value === "S";

  return (
    <button
      onClick={() => onClick(index)}
      className={[
        "relative h-20 w-16 sm:h-24 sm:w-20 rounded-2xl border transition-all duration-200",
        "flex items-center justify-center",
        "bg-zinc-900 border-zinc-700",
        isLegalFrom ? "ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/20" : "",
        isSelected ? "ring-2 ring-sky-400 scale-105" : "hover:scale-[1.03]",
      ].join(" ")}
      aria-label={`space-${index}`}
    >
      <div className="absolute -top-6 text-xs text-zinc-500">{index + 1}</div>
      {isEmpty ? (
        <div className="text-3xl text-zinc-500">_</div>
      ) : (
        <motion.div
          layout
          initial={false}
          className={[
            "h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 flex items-center justify-center",
            isBrass
              ? "bg-amber-500 border-amber-300 text-zinc-950"
              : "bg-slate-200 border-white text-zinc-900",
          ].join(" ")}
        >
          <div className="flex flex-col items-center justify-center gap-0.5">
            <div className="text-[10px] font-bold tracking-wide">{isBrass ? "BRASS" : "SILVER"}</div>
            <div className="text-lg leading-none">{isBrass ? "→" : "←"}</div>
          </div>
        </motion.div>
      )}
    </button>
  );
}

export default function MiceShelfSwapGame() {
  const [board, setBoard] = useState(START);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("Click a highlighted mouse to move it.");

  const legalMoves = useMemo(() => getLegalMoves(board), [board]);
  const legalFromSet = useMemo(() => new Set(legalMoves.map((m) => m.from)), [legalMoves]);
  const won = useMemo(() => isGoal(board), [board]);
  const optimal = useMemo(() => bfsMinimumMoves(START, GOAL), []);

  function resetGame() {
    setBoard(START);
    setHistory([]);
    setSelected(null);
    setMessage("Back to the start. Find the shortest solution.");
  }

  function undoMove() {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setBoard(prev.board);
    setHistory(history.slice(0, -1));
    setSelected(null);
    setMessage("Undid the last move.");
  }

  function doMove(move) {
    const next = applyMove(board, move);
    setHistory([...history, { board: cloneBoard(board), move }]);
    setBoard(next);
    setSelected(null);

    if (isGoal(next)) {
      const used = history.length + 1;
      if (used === optimal) {
        setMessage(`Perfect. You solved it in the minimum ${optimal} moves.`);
      } else {
        setMessage(`Solved in ${used} moves. The minimum is ${optimal}.`);
      }
      return;
    }

    setMessage(move.type === "jump" ? "Nice jump." : "Good move.");
  }

  function onSpaceClick(index) {
    if (won) return;

    const piece = board[index];

    if (selected === null) {
      if (legalFromSet.has(index)) {
        setSelected(index);
        setMessage("Now click the empty space to confirm that move.");
      } else if (piece !== "_") {
        setMessage("That mouse cannot move right now.");
      }
      return;
    }

    if (index === selected) {
      setSelected(null);
      setMessage("Selection cleared.");
      return;
    }

    const chosenMove = legalMoves.find((m) => m.from === selected && m.to === index);
    if (chosenMove) {
      doMove(chosenMove);
      return;
    }

    if (legalFromSet.has(index)) {
      setSelected(index);
      setMessage("Selected a different mouse.");
      return;
    }

    setMessage("Illegal move. Mice only move forward one step or jump over exactly one mouse.");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl grid gap-6">
        <Card className="bg-zinc-900 border-zinc-800 shadow-2xl rounded-3xl">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-zinc-50">
                  Professor’s Mice Shelf
                </CardTitle>
                <p className="text-sm sm:text-base text-zinc-400 mt-2">
                  Swap the brass mice and silver mice by obeying the one-way movement rules.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Moves: {history.length}
                </Badge>
                <Badge className="bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  Minimum: {optimal ?? MIN_MOVES}
                </Badge>
                {won && (
                  <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <Trophy className="h-3.5 w-3.5 mr-1" /> Solved
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-925/50 p-4 sm:p-6 overflow-x-auto">
              <div className="min-w-max flex items-center justify-center gap-2 sm:gap-3 pt-6 pb-2">
                {board.map((value, index) => {
                  const canConfirmToHere = legalMoves.some((m) => m.from === selected && m.to === index);
                  return (
                    <div key={`${index}-${value}`} className="relative">
                      <Space
                        value={value}
                        index={index}
                        onClick={onSpaceClick}
                        isLegalFrom={selected === null ? legalFromSet.has(index) : canConfirmToHere}
                        isSelected={selected === index}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid md:grid-cols-[1.15fr_0.85fr] gap-4">
              <Card className="bg-zinc-950 border-zinc-800 rounded-3xl">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                    <MousePointerClick className="h-4 w-4" /> How to play
                  </div>
                  <p className="text-sm text-zinc-400 leading-6">
                    Brass mice move only to the right. Silver mice move only to the left. A move is legal only if a mouse steps into the adjacent empty space or jumps over exactly one mouse into the empty space beyond.
                  </p>
                  <p className="text-sm text-zinc-400 leading-6">
                    Click a movable mouse, then click the highlighted destination. The app blocks backward and illegal moves automatically.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-950 border-zinc-800 rounded-3xl">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-200">Status</div>
                    <div className="mt-2 min-h-[48px] text-sm text-zinc-400 leading-6">{message}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={undoMove} variant="outline" className="bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800">
                      <Undo2 className="h-4 w-4 mr-2" /> Undo
                    </Button>
                    <Button onClick={resetGame} variant="outline" className="bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800">
                      <RotateCcw className="h-4 w-4 mr-2" /> Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {won && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5"
              >
                <div className="text-lg font-semibold text-emerald-300">Shelf solved 🎉</div>
                <p className="mt-2 text-sm text-emerald-100/90 leading-6">
                  You used <span className="font-semibold">{history.length}</span> moves.
                  {history.length === optimal
                    ? " That is the minimum possible."
                    : ` The puzzle can be solved in ${optimal} moves, so there is still a shorter path.`}
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
