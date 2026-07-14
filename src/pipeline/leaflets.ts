import { normalizeLeafletName } from "../domain/promo.js";
import { LeafletRun, ProductGroup, PromoType } from "../domain/types.js";

export function buildLeafletRuns(sheetTitle: string, groups: ProductGroup[], promoType: PromoType): LeafletRun[] {
  if (promoType !== "common") {
    return [{ title: sheetTitle, promoType, groups, isCommon: false }];
  }

  const byLeaflet = new Map<string, ProductGroup[]>();
  for (const group of groups) {
    const title = normalizeLeafletName(group.leafletName);
    if (!title) continue;
    const list = byLeaflet.get(title) || [];
    list.push(group);
    byLeaflet.set(title, list);
  }

  const runs: LeafletRun[] = [{ title: "Общая", promoType, groups, isCommon: true }];
  if (byLeaflet.size <= 1) return runs;

  for (const [title, leafletGroups] of byLeaflet) {
    runs.push({ title, promoType, groups: leafletGroups, isCommon: false });
  }

  return runs;
}
