import { Cheerio, CheerioAPI } from "cheerio";
import { is as selectIs } from "cheerio-select";
import { Element, Node, isTag, isText } from "domhandler";
import { normalizeName, requestPage, toMarkdown } from "./lib/scraper";
import { parseActionImage, PathfinderAction, replaceLinks } from "./links";
import { PathfinderSource } from "./sources";
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

export function isFollowedBy(node: Node, filter: string): Element | null {
  while (
    node.next &&
    (node.type === "comment" ||
      (isText(node.next) && node.next.nodeValue.trim() === ""))
  ) {
    node = node.next;
  }
  if (node.next && isTag(node.next) && selectIs(node.next, filter)) {
    return node.next;
  }
  return null;
}

export function parseLines(
  $: CheerioAPI,
  line: Cheerio<Node>,
  context?: string,
): Record<string, string> {
  const output: Record<string, string> = {};
  while (line.length > 0) {
    let name = line.text().trim();

    while (true) {
      const nextEl = isFollowedBy(line[0], "b, strong");
      if (!nextEl) break;
      line = $(nextEl);
      name += " " + line.text().trim();
    }

    const contents = line.nextNodeUntil("strong, b");
    let lineText = contents.clone().wrapAll("<div />").parent().html()!;
    lineText = toMarkdown(lineText.trim());
    lineText = replaceLinks(lineText, context);
    if (lineText.endsWith(";"))
      lineText = lineText.substr(0, lineText.length - 1);

    output[name] = lineText.trim();

    line = contents.last().next();
  }
  return output;
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
    traits: traits.toArray().map(t => $(t).text().trim()),
    text: "",
    entries: {},
  };

  // info entries
  const firstPart = traits.length > 0 ? traits.last() : $actionTitle;
  let firstLine = firstPart.nextUntil("strong, b").last().next();
  if (firstLine.length === 0 && $action.find("hr").length > 1) {
    firstLine = $action.find("hr + p > strong, hr + p > b").eq(0);
  }
  outputElement.entries = parseLines(
    $,
    firstLine,
    "/giocare/modalita-incontro/",
  );

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
