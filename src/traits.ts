import {
  debugHTML,
  normalizeText,
  requestPage,
  toMarkdown,
} from "./lib/scraper";
import { replaceLinks } from "./links";
import { parseSource, PathfinderSource } from "./sources";
import { getParagraphGroup } from "./spells";

interface PathfinderShortTrait {
  name: string;
  id: string;
  categories: string[];
}

export async function getAllTraits(): Promise<PathfinderShortTrait[]> {
  const traits = new Map<string, PathfinderShortTrait>();
  const $ = await requestPage(`https://www.archiviodeicercatori.it/tratti/`);

  const entries = $("p>span.tratto");

  for (const entry of entries) {
    const $entry = $(entry);
    const link = $entry.find(">a");
    const name = normalizeText(link.text());
    const id = link.attr("href")!.split("/")[2];
    const categoryTitle = $entry.parent().prev("h2");
    const category =
      categoryTitle.length > 0 ? normalizeText(categoryTitle.text()) : null;

    const prev = traits.get(name);
    if (prev) {
      if (category) prev.categories.push(category);
      continue;
    }

    traits.set(name, {
      id,
      name,
      categories: category ? [category] : [],
    });
  }

  return Array.from(traits.values());
}

interface PathfinderTrait {
  name: string;
  source?: PathfinderSource;
  id: string;
  categories: string[];
  text: string;
}

export async function generateTraits(): Promise<PathfinderTrait[]> {
  const traits = await getAllTraits();
  const output: PathfinderTrait[] = [];

  for (const { id, ...traitInfo } of traits) {
    try {
      const archivioUrl = `https://www.archiviodeicercatori.it/tratti/${id}/`;
      const $ = await requestPage(archivioUrl);

      const nethysUrl = $("strong:contains(Fonte), b:contains(Fonte)")
        .nextAll("[href*='2e.aonprd.com']")
        .attr("href");
      if (!nethysUrl) throw new Error("nethys url not found");

      let firstBlock = $(
        [
          ".fusion-text>h1+hr+p",
          ".fusion-text>h1+hr+em", // NOTE: no <p> wrapping <em>; https://www.archiviodeicercatori.it/tratti/aura/
          ".fusion-text>h1+hr+i", // NOTE: <i> after <hr> instead of <p><em>...</em></p>; https://www.archiviodeicercatori.it/tratti/spingere/
          ".fusion-text>h1+p:has(>em>i)", // NOTE: no <hr> after <h1>; https://www.archiviodeicercatori.it/tratti/viandante-del-crepuscolo/
        ].join(", "),
      );

      const source = parseSource(
        (firstBlock.is("em, i") ? firstBlock : firstBlock.find("em"))
          .eq(0)
          .text(),
      );
      const secondBlock = getParagraphGroup(firstBlock.next("p"));

      let text = secondBlock.clone().wrapAll("<div>").parent().html()!;
      text = toMarkdown(text.trim());
      text = replaceLinks(text);

      output.push({
        ...traitInfo,
        id,
        text,
        source: {
          ...source,
          archivioUrl,
          nethysUrl,
        },
      });
    } catch (ex) {
      console.log(`parsing trait: ${traitInfo.name} (${id})`);
      throw ex;
    }
  }

  return output;
}
