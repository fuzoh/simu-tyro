/** THROWAWAY — floating variant + scenario bar. Deliberately not part of any design. */
import { useEffect } from "react";

import { SCENARIOS } from "./scenarios.ts";

export function PrototypeSwitcher({
  variants,
  current,
  currentName,
  onVariant,
  scenario,
  onScenario,
}: {
  variants: string[];
  current: string;
  currentName: string;
  onVariant: (v: string) => void;
  scenario: string;
  onScenario: (s: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      const i = variants.indexOf(current);
      if (e.key === "ArrowLeft") onVariant(variants[(i - 1 + variants.length) % variants.length]);
      if (e.key === "ArrowRight") onVariant(variants[(i + 1) % variants.length]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, variants, onVariant]);

  const i = variants.indexOf(current);
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-stone-700 bg-stone-900 px-2 py-1.5 text-white shadow-2xl">
      <button
        type="button"
        className="rounded-full px-2 py-0.5 hover:bg-stone-700"
        onClick={() => onVariant(variants[(i - 1 + variants.length) % variants.length])}
      >
        ←
      </button>
      <span className="px-1 font-mono text-xs">
        <b>{current}</b> — {currentName}
      </span>
      <button
        type="button"
        className="rounded-full px-2 py-0.5 hover:bg-stone-700"
        onClick={() => onVariant(variants[(i + 1) % variants.length])}
      >
        →
      </button>
      <span className="mx-1 h-4 w-px bg-stone-600" />
      <select
        value={scenario}
        className="rounded bg-stone-800 px-2 py-1 text-xs"
        onChange={(e) => onScenario(e.target.value)}
      >
        {SCENARIOS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      <span className="pr-1 pl-1 font-mono text-[10px] text-stone-400">PROTOTYPE · ticket 07</span>
    </div>
  );
}
