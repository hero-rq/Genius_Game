import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Sparkles, Bot, User, Trophy } from "lucide-react";

const BOARD = [
  { id: 0, q: 0, r: 0, up: true },
  { id: 1, q: 1, r: 0, up: false },
  { id: 2, q: 2, r: 0, up: true },
  { id: 3, q: 3, r: 0, up: false },
  { id: 4, q: 4, r: 0, up: true },
  { id: 5, q: 0, r: 1, up: false },
  { id: 6, q: 1, r: 1, up: true },
  { id: 7, q: 2, r: 1, up: false },
  { id: 8, q: 3, r: 1, up: true },
  { id: 9, q: 4, r: 1, up: false },
  { id: 10, q: 0, r: 2, up: true },
  { id: 11, q: 1, r: 2, up: false },
  { id: 12, q: 2, r: 2, up: true },
  { id: 13, q: 3, r: 2, up: false },
  { id: 14, q: 4, r: 2, up: true },
  { id: 15, q: 1, r: 3, up: true },
  { id: 16, q: 2, r: 3, up: false },
  { id: 17, q: 3, r: 3, up: true },
  { id: 18, q: 1, r: 4, up: false },
  { id: 19, q: 2, r: 4, up: true },
  { id: 20, q: 3, r: 4, up: false },
];

const TRI_SIZE = 64;
const TRI_H = Math.sqrt(3) / 2 * TRI_SIZE;
const SVG_W = 560;
const SVG_H = 450;

const PLAYER = "player";
const AI = "ai";
const SEARCH_BREADTH = {
  valuesEarly: 6,
  valuesMid: 7,
  cellsEarly: 10,
  cellsMid: 12,
};

const initialHands = () => ({
  player: [1,2,3,4,5,6,7,8,9,10],
  ai: [1,2,3,4,5,6,7,8,9,10],
});

function centerOf(cell) {
  const baseX = 88;
  const baseY = 52;
  const x = baseX + cell.q * (TRI_SIZE / 2) + (cell.r % 2 ? TRI_SIZE / 4 : 0);
  const y = baseY + cell.r * (TRI_H * 0.88);
  return { x, y };
}

function trianglePoints(cell) {
  const { x, y } = centerOf(cell);
  if (cell.up) {
    return `${x},${y - TRI_H / 2} ${x - TRI_SIZE / 2},${y + TRI_H / 2} ${x + TRI_SIZE / 2},${y + TRI_H / 2}`;
  }
  return `${x},${y + TRI_H / 2} ${x - TRI_SIZE / 2},${y - TRI_H / 2} ${x + TRI_SIZE / 2},${y - TRI_H / 2}`;
}

function buildAdjacency() {
  const centers = BOARD.map((c) => centerOf(c));
  const adjacency = {};
  for (const a of BOARD) adjacency[a.id] = [];
  for (let i = 0; i < BOARD.length; i++) {
    for (let j = i + 1; j < BOARD.length; j++) {
      const dx = centers[i].x - centers[j].x;
      const dy = centers[i].y - centers[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < TRI_SIZE * 0.82) {
        adjacency[i].push(j);
        adjacency[j].push(i);
      }
    }
  }
  return adjacency;
}

const ADJ = buildAdjacency();

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function getEmptyCells(placements) {
  return BOARD.filter((c) => !placements[c.id]).map((c) => c.id);
}

function finalScoring(placements) {
  const empty = getEmptyCells(placements);
  if (empty.length !== 1) return null;
  const golden = empty[0];
  let player = 0;
  let ai = 0;
  const contributors = [];
  ADJ[golden].forEach((id) => {
    const p = placements[id];
    if (!p) return;
    contributors.push({ id, owner: p.owner, value: p.value });
    if (p.owner === PLAYER) player += p.value;
    else ai += p.value;
  });
  return { golden, player, ai, neighbors: ADJ[golden], contributors };
}

function evaluateState(state) {
  const { placements, hands } = state;
  const empties = getEmptyCells(placements);
  if (empties.length === 1) {
    const score = finalScoring(placements);
    return (score.ai - score.player) * 1000;
  }

  let aiPotential = 0;
  let playerPotential = 0;
  const aiMax = hands.ai.length ? Math.max(...hands.ai) : 0;
  const playerMax = hands.player.length ? Math.max(...hands.player) : 0;

  for (const empty of empties) {
    let aiAdj = 0;
    let playerAdj = 0;
    for (const n of ADJ[empty]) {
      const p = placements[n];
      if (!p) continue;
      if (p.owner === AI) aiAdj += p.value;
      else playerAdj += p.value;
    }
    aiPotential += aiAdj + aiMax * Math.max(0, 3 - ADJ[empty].filter((n) => placements[n]).length);
    playerPotential += playerAdj + playerMax * Math.max(0, 3 - ADJ[empty].filter((n) => placements[n]).length);
  }

  return aiPotential - playerPotential;
}

function makeMove(state, owner, value, cellId) {
  const next = cloneState(state);
  next.placements[cellId] = { owner, value };
  next.hands[owner] = next.hands[owner].filter((v) => v !== value || ((v = null), false));
  let removed = false;
  next.hands[owner] = next.hands[owner].filter((v) => {
    if (!removed && v === value) {
      removed = true;
      return false;
    }
    return true;
  });
  next.turn = owner === PLAYER ? AI : PLAYER;
  return next;
}

function minimax(state, depth, alpha, beta, maximizing) {
  const empties = getEmptyCells(state.placements);
  if (depth === 0 || empties.length === 1) {
    return { score: evaluateState(state), move: null };
  }

  const owner = maximizing ? AI : PLAYER;
  const hand = state.hands[owner];
  const lateGame = empties.length <= 8;
  const candidateValues = [...hand]
    .sort((a, b) => maximizing ? b - a : a - b)
    .slice(0, Math.min(lateGame ? hand.length : SEARCH_BREADTH.valuesMid, hand.length));

  const candidateCells = [...empties]
    .sort((a, b) => {
      const scoreA = ADJ[a].filter((n) => state.placements[n]).length * 3 + ADJ[a].length;
      const scoreB = ADJ[b].filter((n) => state.placements[n]).length * 3 + ADJ[b].length;
      return scoreB - scoreA;
    })
    .slice(0, Math.min(lateGame ? empties.length : SEARCH_BREADTH.cellsMid, empties.length));

  let bestMove = null;

  if (maximizing) {
    let bestScore = -Infinity;
    for (const value of candidateValues) {
      for (const cellId of candidateCells) {
        const result = minimax(makeMove(state, owner, value, cellId), depth - 1, alpha, beta, false);
        if (result.score > bestScore) {
          bestScore = result.score;
          bestMove = { value, cellId };
        }
        alpha = Math.max(alpha, bestScore);
        if (beta <= alpha) break;
      }
    }
    return { score: bestScore, move: bestMove };
  }

  let bestScore = Infinity;
  for (const value of candidateValues) {
    for (const cellId of candidateCells) {
      const result = minimax(makeMove(state, owner, value, cellId), depth - 1, alpha, beta, true);
      if (result.score < bestScore) {
        bestScore = result.score; 
        bestMove = { value, cellId };
      }
      beta = Math.min(beta, bestScore);
      if (beta <= alpha) break;
    }
  }
  return { score: bestScore, move: bestMove };
}

function chooseAiMove(state) {
  const empties = getEmptyCells(state.placements);
  const remaining = state.hands.ai.length;

  if (remaining >= 9) {
    const centralCells = [...empties].sort((a, b) => {
      const aScore = ADJ[a].length * 2 + ADJ[a].filter((n) => state.placements[n]).length;
      const bScore = ADJ[b].length * 2 + ADJ[b].filter((n) => state.placements[n]).length;
      return bScore - aScore;
    });
    const values = [...state.hands.ai].sort((a, b) => b - a);
    return { cellId: centralCells[0], value: values[0] };
  }

  const depth = remaining <= 4 ? 5 : remaining <= 7 ? 4 : 3;
  const result = minimax(state, depth, -Infinity, Infinity, true);
  if (result.move) return result.move;

  const fallbackCell = [...empties].sort((a, b) => ADJ[b].length - ADJ[a].length)[0];
  return { cellId: fallbackCell, value: Math.max(...state.hands.ai) };
}

function Stat({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${accent}`}>
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function AdjacencyLegend({ activeCell, placements, gameOver, score }) {
  if (activeCell == null) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
        Hover a triangle to see its exact neighbors. The selected triangle stays bright, every touching triangle is connected by orange lines, and all unrelated triangles fade back so the geometry becomes obvious.
      </div>
    );
  }

  const neighbors = ADJ[activeCell] || [];
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="mb-3 text-sm font-semibold text-amber-900">
        {gameOver && score && activeCell === score.golden
          ? `Golden triangle ${activeCell + 1} directly touches:`
          : `Triangle ${activeCell + 1} directly touches:`}
      </div>
      <div className="flex flex-wrap gap-2">
        {neighbors.map((id) => {
          const piece = placements[id];
          return (
            <div key={id} className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
              <span className="font-semibold text-slate-800">{id + 1}</span>
              {piece ? (
                <span className="ml-2 text-slate-600">→ {piece.owner === PLAYER ? "You" : "AI"} {piece.value}</span>
              ) : (
                <span className="ml-2 text-slate-400">→ empty</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GoldenTriangleGame() {
  const nextStarterRef = useRef(PLAYER);
  const [state, setState] = useState({
    placements: {},
    hands: initialHands(),
    turn: AI,
  });
  const [selectedValue, setSelectedValue] = useState(null);
  const [status, setStatus] = useState("Choose a number, then click a triangle.");
  const [thinking, setThinking] = useState(false);
  const [hovered, setHovered] = useState(null);

  const score = useMemo(() => finalScoring(state.placements), [state]);
  const empties = useMemo(() => getEmptyCells(state.placements), [state]);
  const gameOver = empties.length === 1 && !!score;

  useEffect(() => {
    if (gameOver) {
      if (score.player > score.ai) setStatus("You win! ✨ The golden triangle favored your surrounding numbers.");
      else if (score.player < score.ai) setStatus("Computer wins this round 🤖 but that was a proper duel.");
      else setStatus("A draw! Beautifully balanced.");
      return;
    }
    if (state.turn === AI) {
      setThinking(true);
      setStatus("Computer is thinking...");
      const timer = setTimeout(() => {
        const move = chooseAiMove(state);
        setState((prev) => makeMove(prev, AI, move.value, move.cellId));
        setThinking(false);
        setStatus(`Computer played ${move.value}. Your move.`);
      }, 650);
      return () => clearTimeout(timer);
    }
    if (state.turn === PLAYER) {
      setStatus(selectedValue ? `Place ${selectedValue} on a triangle.` : "Choose a number, then click a triangle.");
    }
  }, [state.turn, gameOver]);

  function resetGame() {
    const starter = nextStarterRef.current;
    nextStarterRef.current = starter === PLAYER ? AI : PLAYER;
    setState({ placements: {}, hands: initialHands(), turn: starter });
    setSelectedValue(null);
    setThinking(false);
    setStatus(starter === PLAYER ? "You start this round. Choose a number, then click a triangle." : "Computer starts this round...");
    setHovered(null);
  }

  function playPlayerMove(cellId) {
    if (thinking || state.turn !== PLAYER || !selectedValue || state.placements[cellId]) return;
    setState((prev) => makeMove(prev, PLAYER, selectedValue, cellId));
    setSelectedValue(null);
  }

  const previewScore = useMemo(() => {
    if (!selectedValue || hovered == null || state.placements[hovered]) return null;
    const preview = makeMove(state, PLAYER, selectedValue, hovered);
    return evaluateState(preview);
  }, [selectedValue, hovered, state]);

  const highlightedCell = gameOver && score ? score.golden : hovered;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7cc,white_35%,#f8fafc_80%)] p-6 text-slate-800">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <Card className="rounded-3xl border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-white shadow-lg shadow-amber-100/50">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <div className="mb-1 flex items-center gap-2 text-amber-700">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm font-semibold">Live result bar</span>
                </div>
                <div className="text-sm text-slate-600">{gameOver && score ? "Final golden-triangle totals are locked in." : `Starter this round: ${Object.keys(state.placements).length === 0 ? (state.turn === PLAYER ? "You" : "Computer") : "already decided"}. Next round alternates automatically.`}</div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">You</div>
                  <div className="text-2xl font-black text-slate-900">{gameOver && score ? score.player : "—"}</div>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Computer</div>
                  <div className="text-2xl font-black text-amber-600">{gameOver && score ? score.ai : "—"}</div>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Golden cell</div>
                  <div className="text-2xl font-black text-slate-900">{gameOver && score ? score.golden + 1 : "—"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 grid gap-4 lg:grid-cols-[1.45fr_0.7fr]"
        >
          <Card className="overflow-hidden rounded-3xl border-amber-200 shadow-xl shadow-amber-100/40">
            <CardHeader className="bg-gradient-to-r from-amber-100 via-yellow-50 to-white pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-amber-700">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-semibold">Golden Triangle</span>
                  </div>
                  <CardTitle className="text-3xl font-black tracking-tight">Play against the computer</CardTitle>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    Alternate placing your numbered tokens. When only one space remains, it becomes the golden triangle. The surrounding numbers decide the winner.
                  </p>
                </div>
                <Button onClick={resetGame} variant="outline" className="rounded-2xl">
                  <RotateCcw className="mr-2 h-4 w-4" /> New game
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="mb-4 flex flex-wrap gap-3">
                <Stat label="Your remaining" value={state.hands.player.length} accent="bg-white" />
                <Stat label="Computer remaining" value={state.hands.ai.length} accent="bg-white" />
                <Stat label="Open spaces" value={empties.length} accent="bg-white" />
                <Stat label="Turn" value={state.turn === PLAYER ? "You" : "AI"} accent="bg-white" />
              </div>

              <div className="rounded-[28px] border bg-gradient-to-br from-white to-amber-50/50 p-4 shadow-inner">
                <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="h-[500px] w-full">
                  {highlightedCell != null && ADJ[highlightedCell].map((id) => {
                    const from = centerOf(BOARD.find((c) => c.id === highlightedCell));
                    const to = centerOf(BOARD.find((c) => c.id === id));
                    return (
                      <line
                        key={`edge-${highlightedCell}-${id}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="#f59e0b"
                        strokeWidth="4"
                        strokeLinecap="round"
                        opacity="0.75"
                      />
                    );
                  })}

                  {BOARD.map((cell) => {
                    const occupied = state.placements[cell.id];
                    const isGolden = gameOver && score?.golden === cell.id;
                    const isLegal = state.turn === PLAYER && !thinking && !occupied;
                    const isHovered = hovered === cell.id && isLegal;
                    const isNeighbor = highlightedCell != null && ADJ[highlightedCell].includes(cell.id);
                    const isCenterHighlight = highlightedCell === cell.id;
                    const isDimmed = highlightedCell != null && !isCenterHighlight && !isNeighbor;
                    const { x, y } = centerOf(cell);
                    return (
                      <g
                        key={cell.id}
                        onMouseEnter={() => setHovered(cell.id)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => playPlayerMove(cell.id)}
                        className={isLegal ? "cursor-pointer" : "cursor-default"}
                        opacity={isDimmed ? 0.3 : 1}
                      >
                        <polygon
                          points={trianglePoints(cell)}
                          fill={isGolden ? "#facc15" : occupied ? occupied.owner === PLAYER ? "#111827" : "#f59e0b" : isCenterHighlight ? "#fde68a" : isNeighbor ? "#fff7d6" : isHovered ? "#fef3c7" : "white"}
                          stroke={isGolden ? "#a16207" : isCenterHighlight ? "#d97706" : isNeighbor ? "#f59e0b" : isHovered ? "#d97706" : "#94a3b8"}
                          strokeWidth={isCenterHighlight || isGolden ? "4" : isNeighbor ? "3.5" : "2.5"}
                        />

                        {(isCenterHighlight || isNeighbor) && (
                          <circle
                            cx={x}
                            cy={y}
                            r={isCenterHighlight ? TRI_SIZE * 0.48 : TRI_SIZE * 0.38}
                            fill="none"
                            stroke={isCenterHighlight ? "#d97706" : "#fb923c"}
                            strokeWidth={isCenterHighlight ? "5" : "3"}
                            strokeDasharray={isCenterHighlight ? "" : "8 6"}
                          />
                        )}

                        {!occupied && !isGolden && (
                          <text x={x} y={y + 5} textAnchor="middle" className="fill-slate-400 text-[13px] font-bold">
                            {cell.id + 1}
                          </text>
                        )}
                        {occupied && (
                          <text
                            x={x}
                            y={y + 6}
                            textAnchor="middle"
                            className={`text-[20px] font-black ${occupied.owner === PLAYER ? "fill-white" : "fill-slate-900"}`}
                          >
                            {occupied.value}
                          </text>
                        )}
                        {isGolden && (
                          <>
                            <text x={x} y={y - 8} textAnchor="middle" className="fill-amber-900 text-[10px] font-bold tracking-[0.2em]">
                              GOLDEN
                            </text>
                            <text x={x} y={y + 10} textAnchor="middle" className="fill-amber-950 text-[14px] font-black tracking-[0.2em]">
                              △
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="mt-4">
                <AdjacencyLegend activeCell={highlightedCell} placements={state.placements} gameOver={gameOver} score={score} />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 self-start lg:sticky lg:top-4">
            <Card className="rounded-3xl border-slate-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <User className="h-5 w-5" /> Your hand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {state.hands.player.map((value) => (
                    <button
                      key={value}
                      onClick={() => setSelectedValue(value)}
                      disabled={state.turn !== PLAYER || thinking}
                      className={`group rounded-[18px] border px-3 py-3 text-left transition-all ${selectedValue === value ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200" : "border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/40"} ${state.turn !== PLAYER || thinking ? "opacity-60" : ""}`}
                    >
                      <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">Token</div>
                      <div className="text-2xl font-black text-slate-900">{value}</div>
                      <div className="mt-1 text-[11px] text-slate-500">Click to arm</div>
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-sm text-slate-600">Selected: <span className="font-bold">{selectedValue ?? "none"}</span></p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Bot className="h-5 w-5" /> Match status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{status}</div>
                {previewScore !== null && state.turn === PLAYER && !gameOver && (
                  <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                    Hover preview: this move looks <span className="font-bold">{previewScore > 0 ? "slightly favorable for the computer" : previewScore < 0 ? "promising for you" : "balanced"}</span> based on local threats.
                  </div>
                )}
                {gameOver && score && (
                  <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-4">
                    <div className="mb-3 flex items-center gap-2 font-bold text-amber-900"><Trophy className="h-4 w-4" /> Final golden triangle score</div>
                    <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
                      <span>You</span>
                      <Badge className="text-base">{score.player}</Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
                      <span>Computer</span>
                      <Badge className="text-base">{score.ai}</Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
                      <span>Golden triangle cell</span>
                      <Badge className="text-base">{score.golden + 1}</Badge>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-600">
                      The last empty space became the golden triangle. Only the values on adjacent occupied triangles count.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Quick rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
                <p>1. You and the computer each own the numbers 1 through 10.</p>
                <p>2. Take turns placing one number on any empty triangle.</p>
                <p>3. When only one triangle remains empty, it becomes the golden triangle.</p>
                <p>4. Add the values of your pieces touching that golden triangle. Higher total wins.</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
