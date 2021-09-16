import { normalizeString, requestPage } from "./lib/scraper";

interface PathfinderShortSpell {
  id: string;
  name: string;
  shortDescription: string;
}

export async function getAllSpells(): Promise<PathfinderShortSpell[]> {
  const traditions = ["arcana", "divina", "occulta", "primeva"];

  const spells = new Map<string, PathfinderShortSpell>();
  for (const tradition of traditions) {
    const $ = await requestPage(
      `https://www.archiviodeicercatori.it/incantesimi/tradizione-${tradition}/`,
    );

    const entries = $("table.tablepress:eq(0)").find("tr").slice(1);

    for (const entry of entries) {
      const $entry = $(entry);
      const link = $entry.find(".column-1>a");
      const shortDescription = normalizeString(
        $entry.find(".column-4").text().trim(),
      );
      const name = link.text();
      const id = link.attr("href")!.substr(1).split("/")[1];

      spells.set(name, { id, name, shortDescription });
    }
  }

  return Array.from(spells.values());
}
