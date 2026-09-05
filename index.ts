import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function (pi: ExtensionAPI) {
  pi.on("context", async (event) => {
    const instructions = readFileSync(join(__dirname, "instructions.md"), "utf-8");

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
}
