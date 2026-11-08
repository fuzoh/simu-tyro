/**
 * The way out of a simplified Page to the values it does not show: the notice its fields carry
 * while one of them blocks the computation, and the jump the banner's link takes in its place.
 * Shared by every Page that shows a subset of Avancé's fields.
 */

import type { FieldId } from "@/lib/rail/fields.ts";

import { jumpToField } from "@/components/app/banner.tsx";
import { PageLink } from "@/components/app/navigation-bar.tsx";
import { buttonVariants } from "@/components/ui/button.tsx";
import { AVANCE_NOTICE } from "@/lib/app/avance-copy.ts";
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

/** The way out to the value this Page does not show. A link that looks like a button. */
export function AvanceNotice() {
  return (
    <div className="flex flex-col gap-1" role="status">
      <p className="text-destructive text-xs">⛔ {AVANCE_NOTICE.text}</p>
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
