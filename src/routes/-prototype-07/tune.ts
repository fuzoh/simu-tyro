/** THROWAWAY — tune the "défaut de garde" scenario to fail marginally, not everywhere. */
import { SCENARIOS } from "./scenarios.ts";
import { evaluateClearance, sweep } from "./solver.ts";

for (const s of SCENARIOS) {
  const sw = sweep(s.span, s.P, 240);
  const cl = evaluateClearance(s.span, s.P, sw.steps, s.terrain, s.hRider, 60);
  let bad = 0;
  for (const v of cl.perStep) if (v < 0) bad++;
  console.log(
    `${s.key.padEnd(6)} h_min ${cl.hMin.toFixed(2).padStart(8)} m  contact ${cl.contact.padEnd(6)} ` +
      `pas en défaut ${((bad / cl.perStep.length) * 100).toFixed(0).padStart(3)}%  ` +
      `sweep ${sw.ms.toFixed(2)} ms  couverture ${(sw.coverage * 100).toFixed(0)}%`,
  );
}
