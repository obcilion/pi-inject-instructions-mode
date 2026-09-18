import type { AutocompleteItem } from "@earendil-works/pi-tui";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let mode: string | null = null;

function loadInstructions(): string {
  let instructions = readFileSync(join(__dirname, "instructions", "base.md"), "utf-8");
  if (mode) {
    instructions += `\n\n${readFileSync(join(__dirname, "instructions", `${mode}.md`), "utf-8")}`;
  }
  return instructions;
}

function publishMode(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setStatus("mode", `mode: ${mode ?? "base"}`);
  });
}

export default function (pi: ExtensionAPI) {
  publishMode(pi);

  pi.on("context", async (event) => {
    const instructions = loadInstructions();

    // Append to the last user message in the copy sent to the LLM.
    // The stored session message is never modified.
    for (let i = event.messages.length - 1; i >= 0; i--) {
      const m = event.messages[i];
      if (m.role !== "user") continue;

      if (typeof m.content === "string") {
        m.content = `${m.content}\n\n${instructions}`;
      } else {
        m.content = [...m.content, { type: "text", text: `\n\n${instructions}` }];
      }
      break;
    }

    return { messages: event.messages };
  });

  pi.registerCommand("mode", {
    description: "Switch instruction mode (/mode name, /mode base, /mode to show current)",
    getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
      const modes = [
        "base",
        ...readdirSync(join(__dirname, "instructions"))
          .filter((f) => f.endsWith(".md") && f !== "base.md")
          .map((f) => f.slice(0, -3)),
      ];
      const filtered = modes.filter((m) => m.startsWith(prefix));
      return filtered.length > 0 ? filtered.map((m) => ({ value: m, label: m })) : null;
    },
    handler: async (args, ctx) => {
      const name = args.trim();
      if (!name) {
        ctx.ui.notify(`Mode: ${mode ?? "base"}`, "info");
        return;
      }
      if (name === "base") {
        mode = null;
        ctx.ui.notify("Mode: base", "info");
        ctx.ui.setStatus("mode", "mode: base");
        return;
      }
      if (!existsSync(join(__dirname, "instructions", `${name}.md`))) {
        ctx.ui.notify(`No instructions file for mode '${name}'`, "error");
        return;
      }
      mode = name;
      ctx.ui.notify(`Mode: ${name}`, "info");
      ctx.ui.setStatus("mode", `mode: ${name}`);
    },
  });
}
