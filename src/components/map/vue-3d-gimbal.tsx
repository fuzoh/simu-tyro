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
 */

import type { ReactNode } from "react";

import {
  ChevronDown,
  ChevronUp,
  Keyboard,
  Minus,
  Navigation2,
  Plus,
  RotateCcw,
  RotateCw,
} from "lucide-react";

import type { Vue3dCommand } from "@/lib/map/vue-3d-camera.ts";

import { Button } from "@/components/ui/button.tsx";
import { GIMBAL_COPY, gimbalHint, vue3dKeysHelp } from "@/lib/map/copy.ts";

/**
 * @param headingDeg the camera's heading, degrees clockwise from north.
 * @param onCommand moves the camera.
 */
export function Gimbal({
  headingDeg,
  onCommand,
}: {
  headingDeg: number;
  onCommand: (command: Vue3dCommand) => void;
}) {
  const help = vue3dKeysHelp();
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
    </div>
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
