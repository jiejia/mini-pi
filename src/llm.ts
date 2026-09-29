import type { LLM, LLMResponse, Message, Tool } from "./types.js";
import "dotenv/config";


export class OpenAICompatibleLLM implements LLM {
    constructor(
        private readonly apiKey = process.env.OPENAI_API_KEY,
        private readonly model = process.env.OPENAI_MODEL ?? "gpt-5",
        private readonly baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    ) {
        if (!apiKey) {
            throw new Error("请先设置 OPENAI_API_KEY 环境变量");
        }
    }

    async chat(messages: Message[], tools: Tool[]): Promise<LLMResponse> {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                tools: tools.map((tool) => ({
                    type: "function",
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters,
                    },
                })),
                tool_choice: tools.length > 0 ? "auto" : "none",
            }),
        });

        if (!response.ok) {
            throw new Error(`LLM 请求失败：${response.status} ${await response.text()}`);
        }

        const data = (await response.json()) as {
            choices: Array<{ message: Extract<Message, { role: "assistant" }> }>;
        };

        const message = data.choices[0]?.message;

        if (!message) {
            throw new Error("LLM 没有返回消息。");
        }

        return { message };
    }
}