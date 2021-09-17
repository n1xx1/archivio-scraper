import { Cheerio, CheerioAPI } from "cheerio";
import { is as cheerioIs } from "cheerio-select";
import { normalizeText, requestPage, toMarkdown } from "./lib/scraper";
import { Element, Node } from "domhandler";
import { removeLinks, replaceLinks } from "./links";
import { parseLines } from "./actions";
import { parseSource, PathfinderSource } from "./sources";

export interface PathfinderShortSpell {
  id: string;
  name: string;
  shortText: string;
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
      const shortText = normalizeText($entry.find(".column-4").text());
      const name = normalizeText(link.text());
      const id = link.attr("href")!.substr(1).split("/")[1];

      spells.set(name, { id, name, shortText });
    }
  }

  return Array.from(spells.values());
}

interface SpellActionBlock {
  traits: string[];
  text: string;
  heightenedEntries: Record<string, string>;
  entries: Record<string, string>;
  source: Pick<PathfinderSource, "page" | "manual">;
}

export function processActionBlock(
  $: CheerioAPI,
  $action: Cheerio<Element>,
): SpellActionBlock {
  const [firstBlock, descriptionBlock, heightenedBlock] =
    splitParagraphGroups($action);

  // traits
  const traits = firstBlock.find(".tratto");

  const sourceText = firstBlock.find("em").eq(0).text();

  const outputElement: SpellActionBlock = {
    traits: traits.toArray().map(t => $(t).text().trim()),
    text: "",
    heightenedEntries: {},
    entries: null!,
    source: parseSource(sourceText),
  };

  const firstLine = traits.last().nextUntil("strong, b").last().next();
  outputElement.entries = parseLines($, firstLine);

  // description
  let text = descriptionBlock.clone().wrapAll("<div>").parent().html()!;
  text = toMarkdown(text.trim());
  text = replaceLinks(text);
  outputElement.text = text;

  // heightenedText
  if (heightenedBlock) {
    const firstHeightenedLine = heightenedBlock.find("strong, b").eq(0);
    outputElement.heightenedEntries = parseLines($, firstHeightenedLine);
  }

  return outputElement;
}

export function getParagraphGroup(paragraph: Cheerio<Element>) {
  return paragraph._make([paragraph[0], ...paragraph.nextUntil(":not(p,ul)")]);
}

export function splitParagraphGroups(statBlock: Cheerio<Node>) {
  statBlock.find(">* hr").unwrap();

  return statBlock
    .find(">p:first-child, >hr+p")
    .toArray()
    .map(el => getParagraphGroup(statBlock._make(el)));
}

export type PathfinderTradition = "arcane" | "primal" | "divine" | "occult";
export type PathfinderSpellComponents = "somatic" | "verbal" | "material";
export interface PathfinderSpell {
  id: string;
  name: string;
  text: string;
  shortText: string;
  cantrip: boolean;
  level: number;
  traits: string[];
  source?: PathfinderSource;
  heightenedEffects: Record<string, string>;
  traditions: PathfinderTradition[];
  bloodlines?: string[];
  rawCast?: string; // TODO: more info!
  // castActions?: PathfinderAction;
  // components: PathfinderSpellComponents[];
  radius?: string;
  targets?: string;
  savingThrow?: string;
  duration?: string;
  area?: string;
  deities?: string[];
  requirements?: string;
  trigger?: string;
  cost?: string;
}

export async function generateSpells(): Promise<PathfinderSpell[]> {
  const spells = await getAllSpells();
  const output: PathfinderSpell[] = [];

  for (const base of spells) {
    try {
      const url = `https://www.archiviodeicercatori.it/incantesimi/${base.id}/`;
      const $ = await requestPage(url);

      // TODO: ARCHIVIO ERROR https://www.archiviodeicercatori.it/incantesimi/legame-con-lo-spirito/
      const spellBlock = $(".fusion-text>p>b,.fusion-text>p>strong")
        .eq(0)
        .parent()
        .parent();
      const title = normalizeText(
        spellBlock.find(">p>b, >p>strong").eq(0).text(),
      );

      const titleMatch = title.match(
        /^(.+?)\s+(INCANTESIMO|TRUCCHETTO)\s+(\d+)\s*$/,
      );
      if (!titleMatch) throw new Error(`can't parse title "${title}"`);
      const [, , kind, level] = titleMatch;

      const nethysUrl = $("strong:contains(Fonte), b:contains(Fonte)")
        .nextAll("[href*='2e.aonprd.com']")
        .attr("href");
      if (!nethysUrl) throw new Error("nethys url not found");

      const data = processActionBlock($, spellBlock);
      const newEl: PathfinderSpell = {
        ...base,
        source: {
          ...data.source,
          archivioUrl: url,
          nethysUrl,
        },
        text: data.text,
        cantrip: kind === "TRUCCHETTO",
        level: +level,
        traits: data.traits,
        traditions: [],
        heightenedEffects: data.heightenedEntries,
      };

      for (const [name, text] of Object.entries(data.entries)) {
        switch (name) {
          case "Tradizioni:":
            if (text.includes("arcana")) newEl.traditions.push("arcane");
            if (text.includes("primeva")) newEl.traditions.push("primal");
            if (text.includes("divina")) newEl.traditions.push("divine");
            if (text.includes("occulta")) newEl.traditions.push("occult");
            continue;
          case "Linee di Sangue:":
            newEl.bloodlines = text.split(", ");
            continue;
          case "Lancio":
            newEl.rawCast = text;
            continue;
          case "Bersagli":
          case "Bersaglio":
            newEl.targets = text;
            continue;
          case "Raggio":
            newEl.radius = text;
            continue;
          case "Tiri Salvezza": // TODO: ARCHIVIO ERROR
          case "Tiro Salvezza":
            newEl.savingThrow = text;
            continue;
          case "Durata":
            newEl.duration = text;
            continue;
          case "Area":
            newEl.area = text;
            continue;
          case "Divinità:":
            newEl.deities = removeLinks(text)
              .split(", ")
              .map(s => s.trim());
            continue;
          case "Requisiti":
            newEl.requirements = text;
            continue;
          case "Innesco":
            newEl.trigger = text;
            continue;
          case "Costo":
            newEl.cost = text;
            continue;
          case ",":
            if (newEl.deities && newEl.name === "Ingrandire") {
              // TODO: ARCHIVIO ERROR
              newEl.deities.push(
                ...removeLinks(text)
                  .split(", ")
                  .map(s => s.trim()),
              );
              continue;
            }
        }
        console.log(data.entries);
        throw new Error(`unknown info entry: ${name} - ${text}`);
      }
      output.push(newEl);
    } catch (ex) {
      console.log(`parsing spell: ${base.name} (${base.id})`);
      throw ex;
    }
  }
  return output;
}
