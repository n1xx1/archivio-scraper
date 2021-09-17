import { capitalizeName, requestPage, toMarkdown } from "./lib/scraper";
import { replaceLinks } from "./links";
import { PathfinderSource } from "./sources";

export interface PathfinderCondition {
  type: "condition";
  name: string;
  text: string;
  source?: PathfinderSource;
}

export async function generateConditions() {
  const conditionsUrl = "https://www.archiviodeicercatori.it/condizioni/";
  const $ = await requestPage(conditionsUrl);

  const conditions = $(".fusion-text>h5");
  const output: PathfinderCondition[] = [];
  for (const condition of conditions) {
    const $condition = $(condition);
    const name = $condition.text();
    const anchor = $condition.prev().find("a").attr("name")!;
    const id = conditionMap[anchor];

    if (!id) throw `condition ${name} not found`;

    let text = $("<div>")
      .append(...$condition.nextUntil().clone())
      .html()!;

    text = toMarkdown(text);
    text = replaceLinks(text, "/condizioni");

    output.push({
      type: "condition",
      name: capitalizeName(name),
      text,
      source: {
        manual: "crb",
        page: 618,
        nethysUrl: "https://2e.aonprd.com/Conditions.aspx",
        archivioUrl: `${conditionsUrl}#${anchor}`,
      },
    });
  }

  return output;
}

export const conditionMap: Record<string, string | null> = {
  abbagliato: "Dazzled",
  accecato: "Blinded",
  accelerato: "Quickened",
  affascinato: "Fascinated",
  affaticato: "Fatigued",
  afferrato: "Grabbed",
  amichevole: "Friendly",
  assordato: "Deafened",
  collaborativo: "Helpful",
  condannato: "Doomed",
  confuso: "Confused",
  controllato: "Controlled",
  "danno-persistente": "Persistent Damage",
  ferito: "Wounded",
  immobilizzato: "Immobilized",
  impreparato: "Flat-Footed",
  "in-fuga": "Fleeing",
  indebolito: "Enfeebled",
  indifferente: "Indifferent",
  ingombrato: "Encumbered",
  inosservato: "Unnoticed",
  invisibile: "Invisible",
  maldestro: "Clumsy",
  maldisposto: "Unfriendly",
  morente: "Dying",
  nascosto: "Hidden",
  nauseato: "Sickened",
  "non-individuato": "Undetected",
  occultato: "Concealed",
  osservato: "Observed",
  ostile: "Hostile",
  paralizzato: "Paralyzed",
  pietrificato: "Petrified",
  "privo-di-sensi": "Unconscious",
  prono: "Prone",
  rallentato: "Slowed",
  risucchiato: "Drained",
  rotto: "Broken",
  sbigottito: "Stupefied",
  spaventato: "Frightened",
  stordito: "Stunned",
  trattenuto: "Restrained",
};
