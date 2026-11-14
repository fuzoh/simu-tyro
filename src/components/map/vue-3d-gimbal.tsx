/**
 * The Gimbal over the Vue 3D (#111): the camera's controls, HTML over the canvas's top-left corner
 * as « Placer A / B » are over the vue de dessus's. CesiumJS has none of its own, and no library is
 * brought in for it.
 *
 * Rules this file exists to keep:
 *
 * - **Every button is a key too**, and its hover names the key (`gimbalHint`); the keyboard glyph
 *   lists them all. What a button or a key does is `@/lib/map/vue-3d-camera.ts`'s.
 * - **The north needle turns with the camera**: it points where north is on the screen, so the
 *   heading reads at a glance, and a press turns north up.
 * - **A sibling of the canvas, never inside it**, so a press on a button is no gesture of the
 *   view's; each target is 44 px (`.touch-44`).
 * - **No button's face belongs to another.** The pad's 28 px buttons stand 4 px apart, so each
 *   44 px hit box bleeds 4 px onto its neighbour's face; painted in DOM order, the later one's
 *   would win there, and a click on the edge of « Incliner vers le bas » would fly to « Vue du
 *   départ ». The hit boxes are therefore painted **under** every face (`after:-z-1`), inside the
 *   group's own stacking context (`isolate`), so they still win over the canvas: a face is its own
 *   button, and only the 4 px gaps and the margin around the group take the enlarged target. The
 *   pad's grid box would sit over its gaps' hit boxes, so it lets presses through.
 * - **The Vue embarquée has controls of its own** (#126): « Vue embarquée » (key 3) enters it, off
 *   while no motion is proposed, with its reason on hover and behind an `ⓘ` beside it — a disabled
 *   button takes no focus and no tap, and the reason is printed nowhere else. Inside it the Gimbal
 *   gives way to {@link EmbarkedControls} — lecture or pause, recommencer, the head turned and the
 *   eyes raised or lowered, « Quitter la vue embarquée » — on the same corner and the same hit-box
 *   rule, and the read-out of the ride sits over the view's bottom-left corner, an estimation with
 *   its `ⓘ`.
 */

import type { ReactNode } from "react";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Keyboard,
  Minus,
  Navigation2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  SkipBack,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";

import type { Vue3dCommand } from "@/lib/map/vue-3d-camera.ts";
import type { EmbarkedCommand, EmbarkedReading } from "@/lib/map/vue-3d-embarquee.ts";

import { InfoTip } from "@/components/rail/controls.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  EMBARQUEE_COPY,
  EMBARQUEE_HELP,
  embarkedEndLine,
  embarkedKeysHelp,
  embarkedReadingLine,
  GIMBAL_COPY,
  gimbalHint,
  vue3dKeysHelp,
} from "@/lib/map/copy.ts";
import { EMBARK_KEY } from "@/lib/map/vue-3d-embarquee.ts";

/**
 * @param headingDeg the camera's heading, degrees clockwise from north.
 * @param onCommand moves the camera.
 * @param embark the Vue embarquée's button — `blocked` says why it proposes no motion, `null` when
 *   it can be entered — or `null` on a Page that plays no ride.
 * @param onEmbark enters the Vue embarquée.
 */
export function Gimbal({
  headingDeg,
  onCommand,
  embark,
  onEmbark,
}: {
  headingDeg: number;
  onCommand: (command: Vue3dCommand) => void;
  embark: { readonly blocked: string | null } | null;
  onEmbark: () => void;
}) {
  const help = vue3dKeysHelp(embark !== null);
  return (
    <div
      aria-label={GIMBAL_COPY.title}
      className="absolute top-2 left-2 isolate flex flex-col gap-1"
      role="group"
    >
      {/* The pad's own box lets a press through to the hit boxes under it, so its 4 px gaps keep
          the enlarged target the faces no longer cover; its children take presses again. */}
      <div className="pointer-events-none grid grid-cols-3 gap-1 *:pointer-events-auto">
        <Pad
          command={{ kind: "orbit", step: -1 }}
          keys="←"
          name={GIMBAL_COPY.orbitLeft}
          onCommand={onCommand}
        >
          <RotateCcw />
        </Pad>
        <Pad
          command={{ kind: "tilt", step: 1 }}
          keys="Maj + ↑"
          name={GIMBAL_COPY.tiltUp}
          onCommand={onCommand}
        >
          <ChevronUp />
        </Pad>
        <Pad
          command={{ kind: "orbit", step: 1 }}
          keys="→"
          name={GIMBAL_COPY.orbitRight}
          onCommand={onCommand}
        >
          <RotateCw />
        </Pad>
        <Pad
          command={{ kind: "zoom", step: -1 }}
          keys="−"
          name={GIMBAL_COPY.zoomOut}
          onCommand={onCommand}
        >
          <Minus />
        </Pad>
        <Pad command={{ kind: "north" }} keys="N" name={GIMBAL_COPY.north} onCommand={onCommand}>
          {/* North stands `headingDeg` to the left of the top of the screen. */}
          <Navigation2 style={{ transform: `rotate(${-headingDeg}deg)` }} />
        </Pad>
        <Pad
          command={{ kind: "zoom", step: 1 }}
          keys="+"
          name={GIMBAL_COPY.zoomIn}
          onCommand={onCommand}
        >
          <Plus />
        </Pad>
        <span
          aria-label={help}
          className="bg-background text-muted-foreground grid size-7 place-items-center"
          role="img"
          title={help}
        >
          <Keyboard className="size-3.5" />
        </span>
        <Pad
          command={{ kind: "tilt", step: -1 }}
          keys="Maj + ↓"
          name={GIMBAL_COPY.tiltDown}
          onCommand={onCommand}
        >
          <ChevronDown />
        </Pad>
      </div>
      <Preset
        command={{ kind: "view", view: "depart" }}
        keys="1"
        name={GIMBAL_COPY.vueDuDepart}
        onCommand={onCommand}
      />
      <Preset
        command={{ kind: "view", view: "laterale" }}
        keys="2"
        name={GIMBAL_COPY.vueLaterale}
        onCommand={onCommand}
      />
      {/* A disabled button takes no hover and no focus. The mouse reads the reason on the button's
          wrapper; the keyboard and a finger read it behind the `ⓘ` beside it (#122), which hangs
          outside the column so the Gimbal keeps its width when a reason comes or goes. */}
      {embark !== null && (
        <span className="relative flex">
          <span className="flex" title={embark.blocked ?? undefined}>
            <Button
              className={UNDER_FACES}
              disabled={embark.blocked !== null}
              onClick={onEmbark}
              size="sm"
              title={
                embark.blocked === null ? gimbalHint(EMBARQUEE_COPY.enter, EMBARK_KEY) : undefined
              }
              variant="outline"
            >
              {EMBARQUEE_COPY.enter}
            </Button>
          </span>
          {embark.blocked !== null && (
            <span className="bg-background absolute top-0 left-full ml-1 grid size-7 place-items-center">
              <InfoTip label={EMBARQUEE_COPY.enter} text={embark.blocked} />
            </span>
          )}
        </span>
      )}
    </div>
  );
}

/**
 * The Vue embarquée's controls, in the Gimbal's place, and the ride's read-out over the bottom-left
 * corner.
 *
 * @param reading the ride at the instant shown, `null` until the first is told.
 * @param onCommand plays, pauses, starts over or turns the head.
 * @param onExit leaves the Vue embarquée.
 */
export function EmbarkedControls({
  reading,
  onCommand,
  onExit,
}: {
  reading: EmbarkedReading | null;
  onCommand: (command: EmbarkedCommand) => void;
  onExit: () => void;
}) {
  const help = embarkedKeysHelp();
  const playing = reading?.playing ?? false;
  // Entering is a press or a key inside the view: the focus lands on « Lecture », so the keys answer
  // at once where the button that entered is gone.
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus({ preventScroll: true }), []);
  return (
    <>
      <div
        aria-label={EMBARQUEE_COPY.title}
        className="absolute top-2 left-2 isolate flex flex-col items-start gap-1"
        role="group"
      >
        <div className="pointer-events-none flex gap-1 *:pointer-events-auto">
          <Button
            aria-label={playing ? EMBARQUEE_COPY.pause : EMBARQUEE_COPY.play}
            className={UNDER_FACES}
            onClick={() => onCommand({ kind: playing ? "pause" : "play" })}
            ref={first}
            size="icon-sm"
            title={gimbalHint(playing ? EMBARQUEE_COPY.pause : EMBARQUEE_COPY.play, "Espace")}
            variant="outline"
          >
            {playing ? <Pause /> : <Play />}
          </Button>
          <Turn
            command={{ kind: "restart" }}
            keys="R"
            name={EMBARQUEE_COPY.restart}
            onCommand={onCommand}
          >
            <SkipBack />
          </Turn>
          <Turn
            command={{ kind: "look", step: -1 }}
            keys="←"
            name={EMBARQUEE_COPY.lookLeft}
            onCommand={onCommand}
          >
            <ChevronLeft />
          </Turn>
          <Turn
            command={{ kind: "tilt", step: 1 }}
            keys="↑"
            name={EMBARQUEE_COPY.lookUp}
            onCommand={onCommand}
          >
            <ChevronUp />
          </Turn>
          <Turn
            command={{ kind: "tilt", step: -1 }}
            keys="↓"
            name={EMBARQUEE_COPY.lookDown}
            onCommand={onCommand}
          >
            <ChevronDown />
          </Turn>
          <Turn
            command={{ kind: "look", step: 1 }}
            keys="→"
            name={EMBARQUEE_COPY.lookRight}
            onCommand={onCommand}
          >
            <ChevronRight />
          </Turn>
          <span
            aria-label={help}
            className="bg-background text-muted-foreground grid size-7 place-items-center"
            role="img"
            title={help}
          >
            <Keyboard className="size-3.5" />
          </span>
        </div>
        <Button
          className={UNDER_FACES}
          onClick={onExit}
          size="sm"
          title={gimbalHint(EMBARQUEE_COPY.exit, "Échap")}
          variant="outline"
        >
          <X />
          {EMBARQUEE_COPY.exit}
        </Button>
      </div>
      <div className="bg-background/80 text-foreground absolute right-20 bottom-0 left-0 flex w-fit flex-col px-1 text-xs">
        <span className="flex items-center gap-1">
          {EMBARQUEE_COPY.ride} · {EMBARQUEE_COPY.estimate}
          <InfoTip label={EMBARQUEE_COPY.enter} text={EMBARQUEE_HELP} />
        </span>
        {reading !== null && (
          <>
            <span className="font-mono">{embarkedReadingLine(reading)}</span>
            <span>{embarkedEndLine(reading.end)}</span>
          </>
        )}
      </div>
    </>
  );
}

/** One of the Vue embarquée's square buttons: an icon, its name and the key that does the same. */
function Turn({
  command,
  keys,
  name,
  onCommand,
  children,
}: {
  command: EmbarkedCommand;
  keys: string;
  name: string;
  onCommand: (command: EmbarkedCommand) => void;
  children: ReactNode;
}) {
  return (
    <Button
      aria-label={name}
      className={UNDER_FACES}
      onClick={() => onCommand(command)}
      size="icon-sm"
      title={gimbalHint(name, keys)}
      variant="outline"
    >
      {children}
    </Button>
  );
}

/** `.touch-44`, its hit box painted under every button's face: see the module's rules. */
const UNDER_FACES = "touch-44 after:-z-1";

type Control = {
  command: Vue3dCommand;
  /** The key that does the same, as the hover names it. */
  keys: string;
  name: string;
  onCommand: (command: Vue3dCommand) => void;
};

/** One of the pad's square buttons: an icon, its name for assistive technology and the hover. */
function Pad({ command, keys, name, onCommand, children }: Control & { children: ReactNode }) {
  return (
    <Button
      aria-label={name}
      className={UNDER_FACES}
      onClick={() => onCommand(command)}
      size="icon-sm"
      title={gimbalHint(name, keys)}
      variant="outline"
    >
      {children}
    </Button>
  );
}

/** A Vue prédéfinie, named in full. */
function Preset({ command, keys, name, onCommand }: Control) {
  return (
    <Button
      className={UNDER_FACES}
      onClick={() => onCommand(command)}
      size="sm"
      title={gimbalHint(name, keys)}
      variant="outline"
    >
      {name}
    </Button>
  );
}
