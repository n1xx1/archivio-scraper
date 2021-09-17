export interface PathfinderSource {
  manual: string;
  page: number;
  nethysUrl: string;
  archivioUrl: string;
}

const manuals = [
  "Manuale di Gioco",
  "Bestiario",
  "Guida del Game Master",
  "Presagi Perduti: Divinità e Magia",
  "Presagi Perduti: Atlante",
  "Era delle Ceneri: Domani Brucerà",
  "Era delle Ceneri: Il Culto delle Ceneri",
  "Era delle Ceneri: La Collina dei Cavalieri Infernali",
];

export function parseSource(
  source: string,
): Pick<PathfinderSource, "manual" | "page"> {
  // NOTE: , sometime missing; https://www.archiviodeicercatori.it/tratti/aura/
  const match = source.match(/Fonte:\s*([^,]+?),?\s*pag.\s*(\d+)/);
  if (!match) throw new Error(`invalid source: ${source}`);
  const [, manual, page] = match;
  if (!manuals.includes(manual)) throw new Error(`invalid source: ${source}`);
  return { manual, page: +page };
}
