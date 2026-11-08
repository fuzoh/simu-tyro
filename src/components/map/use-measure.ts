/**
 * The Mesure's state (#98), wired: whether the tool is on, its points, and the profil asked for
 * between them. It lives here, in the map's own state — never in the store, so a Mesure is not in the
 * Scenario, the Session or the link.
 */

import { useCallback, useEffect, useState } from "react";

import type { LoadedProfile, MeasurePoints, MeasureReading } from "@/lib/map/measure.ts";
import type { Position } from "@/lib/scenario/types.ts";
import type { Fetch } from "@/lib/terrain/geoadmin.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { clickMeasure, loadMeasureProfile, profileFor, readMeasure } from "@/lib/map/measure.ts";

export type Measure = {
  readonly active: boolean;
  readonly points: MeasurePoints;
  /** `null` until there are two points. */
  readonly reading: MeasureReading | null;
  readonly click: (at: Position) => void;
  /** Turns the tool on, or off and forgets its points. */
  readonly toggle: () => void;
};

/**
 * @param fetch the platform's `fetch`.
 * @param memory the Scenario's own profil, which answers offline for a point that stands on it.
 */
export function useMeasure(fetch: Fetch, memory: Trace | null): Measure {
  const [active, setActive] = useState(false);
  const [points, setPoints] = useState<MeasurePoints>([]);
  // It answers for the points it was asked between only: see `profileFor`.
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null);

  useEffect(() => {
    if (points.length !== 2) return;
    let current = true;
    void loadMeasureProfile(points[0], points[1], fetch).then((profile) => {
      if (current) setLoaded({ points, profile });
    });
    return () => {
      current = false;
    };
  }, [points, fetch]);

  const click = useCallback((at: Position) => setPoints((held) => clickMeasure(held, at)), []);
  const toggle = useCallback(() => {
    setActive((on) => !on);
    setPoints([]);
  }, []);

  const reading =
    points.length === 2
      ? readMeasure(points[0], points[1], profileFor(points, loaded), memory)
      : null;
  return { active, points, reading, click, toggle };
}
