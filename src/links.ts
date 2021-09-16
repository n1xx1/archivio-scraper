import { conditionMap } from "./conditions";

export interface PathfinderSource {
  manual: "crb";
  page: number;
  nethysUrl: string;
  archivioUrl: string;
}
export function replaceLinks(text: string, base: string) {
  return text.replace(
    /\[([^\]]+)\]\(([^\)]*?)\)/gm,
    (match, text: string, link: string) => {
      if (link.startsWith("#")) link = base + link;

      switch (true) {
        case !!link.match(
          /^\/talenti\/(?:talenti-generici|talenti-di-abilita)\/.+/,
        ): {
          const featName = link.substr(1, link.length - 2).split("/")[1];
          return `[${text}](/feats/${featName})`;
        }
        case link.startsWith("/condizioni"): {
          let conditionName = link.split("#")[1];
          if (conditionName === "osservata") conditionName = "osservato";
          if (conditionName === "nascosta") conditionName = "nascosto";
          if (conditionMap[conditionName] === undefined)
            throw `unknown condition ${conditionName}`;
          return `[${text}](/conditions/${conditionName})`;
        }
        case link.startsWith("/giocare/modalita-incontro#"):
        case link.startsWith("/abilita#"):
        case !!link.match(/^\/abilita\/\w+#/): {
          const actionName = link.split("#")[1];
          return `[${text}](/actions/${actionName})`;
        }
        case link.startsWith("/tratti/"): {
          const traitName = link.substr(1).split("/")[1];
          return `[${text}](/traits/${traitName})`;
        }
        case link.startsWith("/incantesimi/") && !link.endsWith("/"): {
          const spellName = link.substr(1).split("/")[1];
          return `[${text}](/spell/${spellName})`;
        }
        case link.startsWith("/abilita/"):
        case link === "/abilita":
        case link === "/creature":
        case link.startsWith("/oggetti"): // TODO: implement oggetti
        case link.startsWith("/giocare"):
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
    },
  );
}
