/**
 * The way out of a simplified Page to the values it does not show: the notice its fields carry
 * while one of them blocks the computation, and the jump the banner's link takes in its place.
 * Shared by every Page that shows a subset of Avancé's fields.
 */

import type { FieldId, GateId } from "@/lib/rail/fields.ts";

import { jumpToField } from "@/components/app/banner.tsx";
import { PageLink } from "@/components/app/navigation-bar.tsx";
import { Tip } from "@/components/rail/controls.tsx";
import { buttonVariants } from "@/components/ui/button.tsx";
import { AVANCE_NOTICE, avanceNoticeText } from "@/lib/app/avance-copy.ts";
import { CENTRE_IN_RAIL } from "@/lib/layout/collapse.ts";
import { cn } from "@/lib/utils.ts";

/** The notice's link — where a jump lands when the first blocking field is not on this Page. */
const AVANCE_LINK_ID = "avance-link";

/**
 * § 7's jump for a Page that shows a subset of the fields: a field shown here takes the caret as on
 * Avancé, and any other lands on the way to Avancé — the link the fields' notice carries whenever
 * such a field blocks.
 *
 * @param shown whether this Page shows `field`, by the Page's own predicate.
 */
export function jumpOrAvance(field: FieldId, shown: boolean): void {
  if (shown) {
    jumpToField(field);
    return;
  }
  const link = document.getElementById(AVANCE_LINK_ID);
  link?.scrollIntoView(CENTRE_IN_RAIL);
  link?.focus();
}

/**
 * The way out to the value this Page does not show. A link that looks like a button.
 *
 * @param gate the worst gate that value breaches — it decides what the sentence says is gone.
 */
export function AvanceNotice({ gate }: { gate: GateId }) {
  return (
    // The ⛔ in the open and its sentence behind it, announced by the icon's alert region (#122);
    // the way out stays a link in the open.
    <div className="flex items-center gap-1">
      <Tip label={AVANCE_NOTICE.action} text={avanceNoticeText(gate)} tone="error" />
      <PageLink
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "touch-44 self-start")}
        id={AVANCE_LINK_ID}
        to="/avance"
      >
        {AVANCE_NOTICE.action}
      </PageLink>
    </div>
  );
}
