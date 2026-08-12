# A6 · `session/session.ts` — the `localStorage` Session

Stage: A6
Status: open
Blocked by: 15, 16
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 8 ·
[Amendments](../AMENDMENTS.md) **A**, **D**

## Delivers

`src/lib/session/session.ts` — `readSession` / `writeSession` / `clearSession` against
`scoutech:session:v1`. **They take the storage object as a parameter** rather than reaching for
`localStorage`, so the round-trip is a `node` unit test with no DOM (amendment A). The stored shape is
validated on read with **valibot** — a boundary, so it belongs there.

## Gate

Round-trip against an in-memory storage stub, plus the version key: an unrecognised version is
**discarded, never migrated silently**. A stored blob that fails its schema is discarded the same way.

## Notes

- **The Session is a superset of the Scenario.** A Scenario holds only the *active* configuration;
  the Session may also hold a **Trace cached while not being the active terrain source**, and the
  retained inactive Material Spec.
- **Read synchronously in a lazy initialiser** at the client-only subtree's first render — measured
  never to run on the server inside `ClientOnly`. So `readSession()` must exist before the store
  does, and there is **no frame before it lands**.
- **« Saisie en cours » suspends the Session write.** A browser crash mid-edit loses the *edit* and
  keeps the last complete Scenario. That is the intended trade, and it is the one place the user's
  most recent keystrokes are deliberately not persisted — **and nothing on screen says so.**
- The imported trace **stays local**. Nothing is ever sent anywhere.
- **Back is not undo.** History restores search params but not the retained specs, landing the user
  somewhere subtly different — so no attempt is made to make history an undo stack.
