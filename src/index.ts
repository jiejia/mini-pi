import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import "dotenv/config";
import {type} from "node:os";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";
const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

if (!apiKey) {
    throw new Error("请先设置 OPENAI_API_KEY 环境变量");
}

const rl = readline.createInterface({ input, output });

async function askLLM(message: string): Promise<string> {
    const response = await fetch(baseUrl +"/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [{ role: "user", content: message }],
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenAI API 请求失败：${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
    };

    // console.log(data.choices?.[0]?.message);


    return data.choices?.[0]?.message?.content ?? "模型没有返回文本。";
}

while (true) {
    const userInput = await rl.question("You: ");

    if (userInput === "/exit") {
        break;
    }

    const answer = await askLLM(userInput);

    console.log(`Mini Pi: ${answer}`);
}

rl.close();