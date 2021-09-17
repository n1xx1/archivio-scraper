import { conditionMap } from "./conditions";

const incantesimiPages = [
  "/incantesimi/incantesimi-focalizzati/",
  "/incantesimi/tradizione-arcana/",
  "/incantesimi/tradizione-divina/",
  "/incantesimi/tradizione-primeva/",
  "/incantesimi/tradizione-occulta/",
  "/incantesimi/rituali/",
  "/incantesimi/",
];

const linkRegex = /\[([^\]]+)\]\(([^\)]+?)\)/gm;
const imageRegex = /!\[\]\(([^\)]+?)\)/gm;

export function removeLinks(text: string) {
  return text.replace(linkRegex, (match, text: string) => {
    return text;
  });
}

export function replaceLinks(text: string, base?: string) {
  text = text.replace(linkRegex, (match, text: string, link: string) => {
    if (base && link.startsWith("#")) link = base + link;

    if (link === "/tratti7uditivo/") {
      link = "/tratti/uditivo/"; // TODO: ARCHIVIO ERROR
    }
    if (
      link === "http://adcpf2.seedcommunity.it/incantesimi/rituali/liberta/" &&
      text === "stordita"
    ) {
      link = "/condizioni#stordito"; // TODO: ARCHIVIO ERROR
    }

    switch (true) {
      case !!link.match(
        /^\/talenti\/(?:talenti-generici|talenti-di-abilita)\/.+/,
      ): {
        const featName = link.substr(1, link.length - 2).split("/")[1];
        return `[${text}](/feats/${featName})`;
      }
      case link === "/condizione/#nascosto": // TODO: ARCHIVIO ERROR
      case link.startsWith("/condizioni/#"):
      case link.startsWith("/condizioni#"): {
        let conditionName = link.split("#")[1];
        if (conditionName === "osservata") conditionName = "osservato"; // TODO: ARCHIVIO ERROR
        if (conditionName === "nascosta") conditionName = "nascosto"; // TODO: ARCHIVIO ERROR
        if (conditionMap[conditionName] === undefined)
          throw new Error(`unknown condition ${conditionName} (${link})`);
        return `[${text}](/conditions/${conditionName})`;
      }
      case link.startsWith("/giocare/modalita-incontro#"):
      case link.startsWith("/abilita#"):
      case !!link.match(/^\/abilita\/\w+#/): {
        const actionName = link.split("#")[1];
        return `[${text}](/actions/${actionName})`;
      }
      case link.startsWith("/tratto/"):
      case link.startsWith("/tratti/"): {
        const traitName = link.substr(1).split("/")[1];
        return `[${text}](/traits/${traitName})`;
      }
      case link.startsWith("/incantesimi/") &&
        !incantesimiPages.includes(link): {
        const spellName = link.substr(1).split("/")[1];
        return `[${text}](/spell/${spellName})`;
      }
      case link.startsWith("/ambientazione/divinita/"): {
        const deityName = link.substr(1).split("/")[2];
        return `[${text}](/deity/${deityName})`;
      }
      case link.startsWith("/creature/mostri/") &&
        link !== "/creature/mostri/modelli/": {
        const monsterName = link.substr(1).split("/")[2];
        return `[${text}](/monsters/${monsterName})`;
      }
      case link.startsWith("/abilita/"):
      case link === "/abilita":
      case link === "/creature":
      case link === "/tratti":
      case link === "/ambientazione/lingue/":
      case link === "/condizioni":
      case link === "/condizioni/":
      case link === "/talenti/talenti-generici/":
      case link === "/talenti/talenti-di-abilita/":
      case link.startsWith("/creature/capacita"):
      case link.startsWith("/archetipi"): // TODO: implement archetypes
      case link.startsWith("/stirpi"): // TODO: implement ancestries
      case link.startsWith("/classi"): // TODO: implement classi
      case link.startsWith("/oggetti"): // TODO: implement oggetti
      case link.startsWith("/giocare"):
      // NOTE: absolute url; https://www.archiviodeicercatori.it/tratti/brutale/
      case link ===
        "https://archiviodeicercatori.it/giocare/prove-specifiche-e-prove-speciali/#tiri-per-colpire":
      case link.startsWith("/game-master/"):
      case link.startsWith("/introduzione/"):
      case link.startsWith("/pericoli"):
      case !!link.match(/^\/oggetti\/equipaggiamento\/?#/):
      case link.startsWith("/incantesimi#"):
      case link === "/incantesimi": {
        // console.debug(`rule not implemented ${text}, ${link}`);
        return text;
      }
      case link === "http://url": {
        const allowedBrokenLinks = [
          "CD",
          "Volume",
          "penalità alle prove",
          "Attivazione",
        ];
        if (!allowedBrokenLinks.includes(text))
          console.warn(`broken link ${link} (${text})`);
        return text;
      }
      default:
        throw new Error(`unknown link: ${link} (${text})`);
    }
  });
  text = text.replace(imageRegex, (match, img) => {
    const actionImg = tryParseActionImage(img);
    if (actionImg) {
      return `[${textActionCost(actionImg)}]`;
    }
    throw new Error(`unknown image: ${img}`);
  });
  return text;
}

export type PathfinderAction = "free" | "1" | "2" | "3" | "reaction";

export function parseActionImage(src?: string): PathfinderAction | null {
  if (!src) return null;
  const img = tryParseActionImage(src);
  if (!img) throw new Error(`unknown image: ${src}`);
  return img;
}

export function tryParseActionImage(src?: string): PathfinderAction | null {
  if (!src) return null;
  if (src.includes("reaction")) return "reaction";
  if (src.includes("1-azione")) return "1";
  if (src.includes("2-azioni")) return "2";
  if (src.includes("3-azioni")) return "3";
  if (src.includes("free")) return "free";
  return null;
}

export function textActionCost(a: PathfinderAction) {
  switch (a) {
    case "1":
      return "A";
    case "2":
      return "AA";
    case "3":
      return "AAA";
    case "free":
      return "F";
    case "reaction":
      return "R";
  }
}
