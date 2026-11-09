/**
 * A genuine load failure — every app Page's `errorComponent`, and the only thing that reaches it.
 * It says so plainly, which is the one thing the refusal surface may **not** say: there, nothing
 * failed and the status line agrees; here, something did.
 */
export function LoadFailure() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-start gap-3 p-6 pt-16" role="alert">
      {/* `text-lg` / `text-xs`: the three-size scale covers the error screens too. */}
      <h1 className="font-heading text-lg font-semibold tracking-tight">
        Le simulateur n'a pas pu démarrer.
      </h1>
      <p className="text-muted-foreground text-xs">Rechargez la page.</p>
    </main>
  );
}
