import type { LLM, Message, Tool } from "./types.js";

const SYSTEM_PROMPT = `
You are Mini Pi, a coding agent.

You are running inside the user's project directory.

You can inspect and modify files using tools.

Rules:

- Read files before modifying them.
- Prefer small, targeted edits.
- Explain what you changed.
- Do not invent tool results.
- Use bash when necessary.
`;

export class Agent {
  private readonly messages: Message[];

  constructor(
      private readonly llm: LLM,
      private readonly tools: Tool[],
  ) {
    this.messages = [
      { role: "system", content: SYSTEM_PROMPT },
    ];
  }

  async prompt(userInput: string): Promise<void> {
    this.messages.push({
      role: "user",
      content: userInput,
    });

    while (true) {
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