import type { LLM, Message, Tool } from "./types.js";
import { readFile } from "node:fs/promises";
import {sessionManager} from "./session-manager.ts";

export async function loadProjectInstructions(): Promise<string> {
  try {
    return await readFile("AGENTS.md", "utf8");
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

const instructions = await loadProjectInstructions();

const systemPrompt = `
You are Mini Pi, a coding agent.

Project instructions:
${instructions || "No AGENTS.md found."}
`;



export class Agent {
  private readonly messages: Message[];

  constructor(
      private readonly llm: LLM,
      private readonly tools: Tool[],
  ) {
    this.messages = [
      { role: "system", content: systemPrompt },
    ];
  }

  async prompt(userInput: string, sessionId: string): Promise<void> {
    this.messages.push({
      role: "user",
      content: userInput,
    });

    while (true) {
      // save sessions
      sessionManager.save(sessionId, this.messages);


      const response = await this.llm.chat(this.messages, this.tools);
      const assistantMessage = response.message;

      this.messages.push(assistantMessage);

      if (assistantMessage.content) {
        console.log(assistantMessage.content);
      }

      if (!assistantMessage.tool_calls?.length) {
        break;
      }

      for (const call of assistantMessage.tool_calls) {
        const tool = this.tools.find(
            (tool) => tool.name === call.function.name,
        );

        if (!tool) {
          this.messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: `Unknown 【tool]: ${call.function.name} [args] ${call.function.arguments}`,
          });
          continue;
        }

        console.log(`[tool] ${call.function.name} [args] ${call.function.arguments}`);

        try {
          const args = JSON.parse(call.function.arguments) as Record<string, unknown>;
          const result = await tool.execute(args);

          this.messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: result,
          });
        } catch (error) {
          this.messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }


  }
}