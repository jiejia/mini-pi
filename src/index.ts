import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { Agent } from "./agent.ts";
import { tools } from "./tools/index.ts";
import { OpenAICompatibleLLM } from "./llm.ts";

const rl = readline.createInterface({ input, output });
const llm = new OpenAICompatibleLLM();
const agent = new Agent(llm, tools);

console.log("Mini Pi v0.1");
console.log("Type /exit to quit.");
console.log();

const sessionId = crypto.randomUUID();

console.log("Session ID: " + sessionId);

try {
    while (true) {
        const userInput = await rl.question("You: ");

        if (!userInput.trim()) {
            continue;
        }
0
        if (userInput === "/exit") {
            break;
        }

        await agent.prompt(userInput, sessionId);
        console.log();
    }
} finally {
    rl.close();
}