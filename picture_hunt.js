import React, { useMemo, useState } from "react";

// 🎯 Improved colors (high contrast, no confusion)
const COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Deep Blue", value: "#1d4ed8" },
  { name: "Green", value: "#16a34a" },
  { name: "Yellow", value: "#facc15" },
  { name: "Purple", value: "#9333ea" },
  { name: "Pink", value: "#ec4899" },
  { name: "Orange", value: "#f97316" },
  { name: "Teal", value: "#14b8a6" }, // replaced Cyan
  { name: "Brown", value: "#92400e" }, // replaced Lime
  { name: "White", value: "#f8fafc" }
];

// 🎯 Added 2 new clearly distinct shapes: Arrow + Trapezoid
const SHAPES = [
  { name: "Square", type: "square" },
  { name: "Circle", type: "circle" },
  { name: "Triangle", type: "triangle" },
  { name: "Star", type: "star" },
  { name: "Diamond", type: "diamond" },
  { name: "Hexagon", type: "hexagon" },
  { name: "Pentagon", type: "pentagon" },
  { name: "Cross", type: "cross" },
  { name: "Ring", type: "ring" },
  { name: "Capsule", type: "capsule" },
  { name: "Arrow", type: "arrow" },
  { name: "Trapezoid", type: "trapezoid" }
];

const LETTER_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PANEL_COUNT = 20;
const QUERY_COUNT = 10;
const PREVIEW_MS = 5000;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateShapeIcons(count) {
  const combos = [];

  COLORS.forEach((color) => {
    SHAPES.forEach((shape) => {
      combos.push({
        id: `${color.name}-${shape.name}`,
        color,
        shape
      });
    });
  });

  return shuffle(combos).slice(0, count);
}

function ShapeIcon({ icon, size = 52 }) {
  if (!icon) return null;

  const common = {
    width: size,
    height: size,
    background: icon.color.value,
    boxShadow: `0 0 24px ${icon.color.value}55`,
    border: icon.color.name === "White" ? "2px solid #94a3b8" : "2px solid rgba(255,255,255,0.24)"
  };

  const shapeStyle = (() => {
    switch (icon.shape.type) {
      case "square":
        return { ...common, borderRadius: 8 };
      case "circle":
        return { ...common, borderRadius: "50%" };
      case "triangle":
        return {
          width: 0,
          height: 0,
          borderLeft: `${size / 2}px solid transparent`,
          borderRight: `${size / 2}px solid transparent`,
          borderBottom: `${size}px solid ${icon.color.value}`,
          filter: `drop-shadow(0 0 16px ${icon.color.value}77)`
        };
      case "star":
        return {
          width: size,
          height: size,
          background: icon.color.value,
          clipPath:
            "polygon(50% 0%, 61% 35%, 98% 35%, 68% 56%, 79% 91%, 50% 70%, 21% 91%, 32% 56%, 2% 35%, 39% 35%)",
          filter: `drop-shadow(0 0 14px ${icon.color.value}77)`
        };
      case "diamond":
        return { ...common, transform: "rotate(45deg)", borderRadius: 6 };
      case "hexagon":
        return {
          ...common,
          clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)"
        };
      case "pentagon":
        return {
          ...common,
          clipPath: "polygon(50% 0%, 98% 35%, 79% 100%, 21% 100%, 2% 35%)"
        };
      case "cross":
        return {
          ...common,
          clipPath:
            "polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)"
        };
      case "ring":
        return {
          width: size,
          height: size,
          borderRadius: "50%",
          border: `${Math.max(8, size / 6)}px solid ${icon.color.value}`,
          boxShadow: `0 0 24px ${icon.color.value}55`,
          background: "transparent"
        };
      case "capsule":
        return { ...common, width: size * 1.35, borderRadius: 999 };
      case "arrow":
        return {
          width: 0,
          height: 0,
          borderTop: `${size / 2}px solid transparent`,
          borderBottom: `${size / 2}px solid transparent`,
          borderLeft: `${size}px solid ${icon.color.value}`,
          filter: `drop-shadow(0 0 12px ${icon.color.value}77)`
        };
      case "trapezoid":
        return {
          width: size,
          height: size * 0.6,
          background: icon.color.value,
          clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)"
        };
      default:
        return common;
    }
  })();

  return <div style={shapeStyle} />;
}

export default function SamePictureHuntShapeColor() {
  const [mapping, setMapping] = useState({});
  const [queries, setQueries] = useState([]);
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [revealed, setRevealed] = useState({});
  const [locked, setLocked] = useState({});
  const [message, setMessage] = useState("Press start to generate 20 random panels.");
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [selectionLocked, setSelectionLocked] = useState(false);

  const currentTarget = queries[currentQueryIndex] || null;

  const initGame = async () => {
    const icons = generateShapeIcons(PANEL_COUNT);
    const chosenLetters = shuffle(LETTER_POOL).slice(0, PANEL_COUNT);
    const nextMapping = {};

    chosenLetters.forEach((letter, index) => {
      nextMapping[letter] = icons[index];
    });

    const nextQueries = shuffle(icons).slice(0, QUERY_COUNT);

    setMapping(nextMapping);
    setQueries(nextQueries);
    setCurrentQueryIndex(0);
    setScore(0);
    setMistakes(0);
    setLocked({});
    setSelectionLocked(true);
    setPhase("preview");
    setMessage("Preview: memorize each panel.");

    for (let i = 0; i < chosenLetters.length; i += 1) {
      const letter = chosenLetters[i];
      setPreviewIndex(i);
      setRevealed({ [letter]: nextMapping[letter] });
      await new Promise((resolve) => window.setTimeout(resolve, PREVIEW_MS));
    }

    setRevealed({});
    setPreviewIndex(-1);
    setPhase("play");
    setSelectionLocked(false);
    setMessage("Match the target icon.");
  };

  const finishGame = (finalMessage) => {
    setPhase("finished");
    setSelectionLocked(true);
    setRevealed({ ...mapping });
    setMessage(finalMessage);
  };

  const handleGuess = (letter) => {
    if (phase !== "play" || selectionLocked || !currentTarget) return;

    const pickedIcon = mapping[letter];
    setSelectionLocked(true);
    setRevealed({ [letter]: pickedIcon });

    const isCorrect = pickedIcon.id === currentTarget.id;

    window.setTimeout(() => {
      if (isCorrect) {
        const nextScore = score + 1;
        const nextIndex = currentQueryIndex + 1;
        setScore(nextScore);
        setLocked((prev) => ({ ...prev, [letter]: true }));

        if (nextIndex >= queries.length) {
          finishGame(`Finished 🎉 Score: ${nextScore}/${queries.length}`);
          return;
        }

        setCurrentQueryIndex(nextIndex);
        setRevealed({});
        setSelectionLocked(false);
        setMessage("Correct.");
      } else {
        const nextMistakes = mistakes + 1;
        const nextIndex = currentQueryIndex + 1;
        setMistakes(nextMistakes);

        if (nextIndex >= queries.length) {
          finishGame(`Finished. Score: ${score}/${queries.length}. Mistakes: ${nextMistakes}`);
          return;
        }

        setCurrentQueryIndex(nextIndex);
        setRevealed({});
        setSelectionLocked(false);
        setMessage("Wrong.");
      }
    }, 1200);
  };

  const panelEntries = useMemo(() => Object.entries(mapping), [mapping]);

  return (
    <div style={{ minHeight: "100vh", background: "#070b16", color: "white", padding: 24 }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>Same Picture Hunt — Shape Mode</h1>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <button onClick={initGame} disabled={phase === "preview"} style={{ padding: "12px 20px", borderRadius: 12, background: "#2563eb", color: "white" }}>
            Start Game
          </button>

          <div>Score: {score} / {QUERY_COUNT}</div>
          <div>Mistakes: {mistakes}</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ minHeight: 116, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {phase === "preview" && panelEntries[previewIndex] ? <ShapeIcon icon={mapping[panelEntries[previewIndex][0]]} size={64} /> : null}
            {phase === "play" && currentTarget ? <ShapeIcon icon={currentTarget} size={64} /> : null}
            {phase === "finished" && "Done"}
          </div>
          <div>{message}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
          {panelEntries.map(([letter, icon]) => {
            const visibleIcon = revealed[letter];

            return (
              <button key={letter} onClick={() => handleGuess(letter)} disabled={phase !== "play" || selectionLocked} style={{ minHeight: 110 }}>
                <div>{letter}</div>
                <div>{visibleIcon ? <ShapeIcon icon={visibleIcon} size={44} /> : "■"}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
