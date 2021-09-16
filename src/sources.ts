export interface PathfinderSource {
  manual: string;
  page: number;
  nethysUrl: string;
  archivioUrl: string;
}

const manuals = [
  "Manuale di Gioco",
  "Presagi Perduti: Divinità e Magia",
  "Presagi Perduti: Atlante",
  "Era delle Ceneri: Domani Brucerà",
];

export function parseSource(
  source: string,
): Pick<PathfinderSource, "manual" | "page"> {
  const match = source.match(/Fonte:\s*([^,]+?),\s*pag.\s*(\d+)/);
  if (!match) throw new Error(`invalid source: ${source}`);
  const [, manual, page] = match;
  if (!manuals.includes(manual)) throw new Error(`invalid source: ${source}`);
  return { manual, page: +page };
}
