/**
 * The Skeleton — « v1 build spec » § 7 (*The Skeleton — the only thing the server renders below the
 * document*) and § 8 (*La ligne `<noscript>` du Skeleton*).
 *
 * **It is not optional.** Measured: with no `pendingComponent` the server ships an **empty
 * `<body>`**, because `ClientOnly`'s fallback defaults to `null` — so the choice was Skeleton or
 * blank page, not Skeleton or something better.
 *
 * It reproduces **containers, not controls**:
 *
 * - the Rail's five section headings in order, plus the app's name as static text — no field rows,
 *   no group frames;
 * - both chart frames at the spine's proportions, from the same CSS the live app uses;
 * - the read-out cells' **labels, never their values, and never a « — »** — « — » is spent on
 *   `Indéterminé` (attempted, unavailable), and a dash in a clearance cell before anything was
 *   attempted is a number-shaped thing with no provenance;
 * - the banner band's **height reserved with nothing drawn in it**;
 * - **no interactive control at all** — the unit selector, « Copier le lien », the overflow menu,
 *   the layer toggles, « ×1 vraie échelle » and the `x` field are absent, their slots' heights
 *   reserved. A control that is present and dead is worse than one that is absent.
 * - **no spinner and no sentence**, because a spinner is a promise of waiting that never comes
 *   true — the document is replaced in the same tick as hydration. `aria-busy="true"` on the root,
 *   and **no `aria-live` region**.
 *
 * Its content has no CI check — it needs a DOM, which amendment A removed — so it is
 * [ticket 31](../../../.scratch/zipline-simulator-v1-build/issues/31-shell-and-suppressed-output-browser-pass.md)'s
 * to script. **A state nobody scripts there is a state nobody checks.**
 */

import {
  BannerSlot,
  NOSCRIPT_LINE,
  ProfileBand,
  RAIL_SECTIONS,
  RailHeader,
  RailSection,
  READ_OUT_CELLS,
  ReadOutCell,
  ReadOutCells,
  Shell,
  StripBand,
  ViewStripSlot,
} from "./shell.tsx";

export function Skeleton() {
  return (
    <Shell
      busy
      rail={
        <>
          <RailHeader />
          {RAIL_SECTIONS.map((title) => (
            <RailSection key={title} title={title} />
          ))}
          <noscript className="px-4 py-3 text-sm">{NOSCRIPT_LINE}</noscript>
        </>
      }
      chart={
        <>
          <BannerSlot />
          <ProfileBand />
          <StripBand />
          <ViewStripSlot />
          <ReadOutCells>
            {READ_OUT_CELLS.map((cell) => (
              <ReadOutCell className={cell.narrow} key={cell.label} label={cell.label} />
            ))}
          </ReadOutCells>
        </>
      }
    />
  );
}
