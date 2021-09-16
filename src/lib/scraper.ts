import cheerio, { Cheerio, CheerioAPI } from "cheerio";
import { Node } from "domhandler";
import { fetchBuilder, FileSystemCache } from "node-fetch-cache";
import TurndownService from "turndown";
import initNextNodePlugin from "./cheerio-next-node";

const fetch = fetchBuilder.withCache(new FileSystemCache({}));

export async function requestPage(url: string) {
  const resp = await fetch(url);
  const body = await resp.text();

  const $ = cheerio.load(body);
  initNextNodePlugin($);
  return $;
}

const turndownService = new TurndownService();

export function toMarkdown(html: string) {
  let markdown = turndownService.turndown(html);
  markdown = normalizeString(markdown);
  markdown = markdown.replace(/<!--[\s\S]*?-->/g, "");
  markdown = markdown.replace(
    '"stordito per 1 minuto ',
    '"stordito per 1 minuto"',
  );
  return markdown;
}

export function normalizeString(text: string) {
  text = text.replace(/’/g, "'");
  text = text.replace(/“/g, '"');
  text = text.replace(/\u00A0/g, " ");
  return text;
}

// TODO: trovare tutte le parole
const lowercaseWords = ["del", "dal", "con", "della", "dello"];

export function normalizeName(name: string) {
  return name.toLowerCase().replace(/\b\w+/g, x => {
    if (x.length <= 2 || lowercaseWords.includes(x)) return x;
    return x.substr(0, 1).toUpperCase() + x.substr(1);
  });
}

export function debugHTML($: CheerioAPI, node: Cheerio<Node>) {
  console.log(
    node
      .toArray()
      .map(n => $.html(n))
      .join("\n"),
  );
}
