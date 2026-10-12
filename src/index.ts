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
let currentModel = process.env.OPENAI_MODEL

console.log("Session ID: " + sessionId);

try {
    while (true) {
        const userInput = await rl.question("You: ");

        if (!userInput.trim()) {
            continue;
        }

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
  /models    Show all models
  /sessions  Show all sessions
`);
            continue;
        } else if (userInput === "/clear") {
            sessionId = crypto.randomUUID();
            console.log("Session ID: " + sessionId);
            continue;
        } else if (userInput === "/models") {
            let models = await llm.models()

            models.map((model) => console.log(model));

            continue;

        } else if (userInput === "/sessions") {
            const sessions = await sessionManager.list();
            sessions.map((session) => console.log(session));
            continue;
        }  else if (userInput === "/model") {
            console.log(currentModel);
            continue;
        } else if (userInput === "/session") {
            console.log(sessionId);
            continue;
        }

        await agent.prompt(userInput, sessionId);
        console.log();
    }
} catch (error) {
    console.error("error:", error instanceof Error ? error.message : error);
} finally {
    rl.close();
}