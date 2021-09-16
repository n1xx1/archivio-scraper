import {
  generateActions,
  PathfinderAction,
  PathfinderAnyAction,
} from "./actions";
import { generateConditions } from "./conditions";
import { getAllSpells } from "./spells";

function textActionCost(a: PathfinderAction) {
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
function textActionKind(a: PathfinderAnyAction["type"]): string {
  switch (a) {
    case "basic-action":
      return "Azione Base";
    case "exploration-activity":
      return "Attività in Esplorazione";
  }
}

async function main() {
  const conditions = await generateConditions();
  const actions = await generateActions();
  const spellList = await getAllSpells();

  console.log(spellList);

  // let outText = "";
  // for (const condition of conditions) {
  //   outText += `# ${condition.name}\n\n${condition.text}\n\n`;
  // }

  // for (const action of actions) {
  //   outText += `# ${action.name}`;
  //   if (action.action) {
  //     outText += ` [${textActionCost(action.action)}]`;
  //   }
  //   outText += ` (${textActionKind(action.type)})\n\n`;
  //   if (action.traits.length > 0) {
  //     outText += `:: ${action.traits.join(", ")}\n\n`;
  //   }
  //   if (action.type === "basic-action") {
  //     if (action.trigger) {
  //       outText += `**Innesco** ${action.trigger}\n\n`;
  //     }
  //     if (action.requirements) {
  //       outText += `**Requisiti** ${action.requirements}\n\n`;
  //     }
  //     if (action.frequency) {
  //       outText += `**Frequenza** ${action.frequency}\n\n`;
  //     }
  //   }
  //   outText += `---\n\n${action.text}\n\n`;
  // }
  // process.stdout.write(outText);
}

main().catch((e) => console.log(e));
