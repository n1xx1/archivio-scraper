import { Cheerio, CheerioAPI } from "cheerio";
import { Element } from "domhandler";
import { normalizeName, requestPage, toMarkdown } from "./lib/scraper";
import { PathfinderSource, replaceLinks } from "./links";

export type PathfinderAction = "free" | "1" | "2" | "3" | "reaction";

export interface PathfinderBasicAction
  extends Omit<GenericActionBlock, "entries"> {
  type: "basic-action";
  frequency?: string;
  trigger?: string;
  requirements?: string;
}

export interface PathfinderExplorationActivity
  extends Omit<GenericActionBlock, "entries"> {
  type: "exploration-activity";
}

interface GenericActionBlock {
  name: string;
  source?: PathfinderSource;
  action: PathfinderAction | null;
  traits: string[];
  text: string;
  entries: Record<string, string>;
}

export function processActionBlock(
  $: CheerioAPI,
  $actionTitle: Cheerio<Element>,
): [string, GenericActionBlock] {
  const $action = $actionTitle.parents(".fusion-text").eq(0);

  $action.find(">* hr").unwrap();

  // action main
  const id = $actionTitle.prev().attr("name")!;
  const name = $actionTitle.text().trim();
  const actionCost = parseActionImage($actionTitle.find("img").attr("src")!);

  // traits
  const traits = $action.find(".tratto");

  const outputElement: GenericActionBlock = {
    name: normalizeName(name),
    action: actionCost,
    traits: traits.toArray().map(t => $(t).text()),
    text: "",
    entries: {},
  };

  // info entries
  const firstPart = traits.length > 0 ? traits.last() : $actionTitle;
  let firstLine = firstPart.nextUntil("strong, b").last().next();
  if (firstLine.length === 0 && $action.find("hr").length > 1) {
    firstLine = $action.find("hr + p > strong, hr + p > b").eq(0);
  }
  let line = firstLine;
  while (line.length > 0) {
    const name = line.text().trim();
    const contents = line.nextNodeUntil("strong");
    let lineText = contents.clone().wrapAll("<div />").parent().html()!;
    lineText = toMarkdown(lineText.trim());
    lineText = replaceLinks(lineText, "/giocare/modalita-incontro/");

    outputElement.entries[name] = lineText;

    line = contents.last().next();
  }

  // description
  const descriptionBlock = (
    firstLine.length > 0
      ? firstLine.parents("p").eq(0)
      : $actionTitle.parents("p").eq(0)
  )
    .nextAll("p")
    .eq(0);

  const descriptions = $([
    descriptionBlock[0],
    ...descriptionBlock.nextAll("p"),
  ]);
  let text = descriptions.clone().wrapAll("<div>").parent().html()!;
  text = toMarkdown(text.trim());
  text = replaceLinks(text, "/giocare/modalita-incontro/");

  outputElement.text = text;
  return [id, outputElement];
}

export type PathfinderAnyAction =
  | PathfinderBasicAction
  | PathfinderExplorationActivity;

export async function generateActions(): Promise<PathfinderAnyAction[]> {
  const output: PathfinderAnyAction[] = [];

  {
    const baseUrl =
      "https://www.archiviodeicercatori.it/giocare/modalita-incontro/";
    const $ = await requestPage(baseUrl);
    const actions = $(".fusion-text a[name]+strong");
    for (const action of actions) {
      const $actionTitle = $(action);
      const [id, { entries, ...el }] = processActionBlock($, $actionTitle);
      const newEl: PathfinderBasicAction = {
        ...el,
        type: "basic-action",
        source: {
          manual: "crb",
          page: 468,
          archivioUrl: `${baseUrl}#${id}`,
          nethysUrl: "https://2e.aonprd.com/Rules.aspx?ID=429",
        },
      };

      for (const [name, text] of Object.entries(entries)) {
        switch (name) {
          case "Innesco":
            newEl.trigger = text;
            break;
          case "Requisiti":
            newEl.requirements = text;
            break;
          case "Frequenza":
            newEl.frequency = text;
            break;
          default:
            throw new Error(`unknown info entry name: ${name}`);
        }
      }

      output.push(newEl);
    }
  }

  {
    const baseUrl =
      "https://www.archiviodeicercatori.it/giocare/modalita-esplorazione/";
    const $ = await requestPage(baseUrl);
    const actions = $(".fusion-text a[name]+strong");
    for (const action of actions) {
      const $actionTitle = $(action);
      const [id, { entries, ...el }] = processActionBlock($, $actionTitle);
      const newEl: PathfinderExplorationActivity = {
        ...el,
        type: "exploration-activity",
        source: {
          manual: "crb",
          page: 479,
          archivioUrl: `${baseUrl}#${id}`,
          nethysUrl: "https://2e.aonprd.com/Rules.aspx?ID=469",
        },
      };
      for (const [name] of Object.entries(entries)) {
        throw new Error(`unknown info entry name: ${name}`);
      }
      output.push(newEl);
    }
  }

  return output;
}

function parseActionImage(src: string): PathfinderAction | null {
  if (!src) return null;
  if (src.includes("reaction")) return "reaction";
  if (src.includes("1-azione")) return "1";
  if (src.includes("2-azioni")) return "2";
  if (src.includes("3-azioni")) return "3";
  if (src.includes("free")) return "free";
  throw new Error(`unknown image: ${src}`);
}
