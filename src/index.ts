import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { sessionManager } from "./session-manager.ts";

import { Agent } from "./agent.ts";
import { tools } from "./tools/index.ts";
import { OpenAICompatibleLLM } from "./llm.ts";

const rl = readline.createInterface({ input, output });
const llm = new OpenAICompatibleLLM();
const agent = new Agent(llm, tools);

console.log("Mini Pi v0.1");
console.log("Type /exit to quit.");
console.log();

let sessionId = crypto.randomUUID();

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
        } else if (userInput === "/help") {
            console.log(`
Commands:
  /help     Show this help
  /clear    Clear the current context
  /exit     Exit Mini Pi
  /model    Show the current model
  /session  Show the current session
`);
            continue;
        } else if (userInput === "/clear") {
            sessionId = crypto.randomUUID();
            console.log("Session ID: " + sessionId);
            continue;
        } else if (userInput === "/model") {

        } else if (userInput === "/session") {
            const sessions = await sessionManager.list();
            sessions.map((session) => console.log(session));
            continue;
        }

        await agent.prompt(userInput, sessionId);
        console.log();
    }
} finally {
    rl.close();
}