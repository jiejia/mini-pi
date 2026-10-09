import { writeFile } from "node:fs/promises";
import type {Message} from "./types.ts";
import path from "node:path";
import { fileURLToPath } from "node:url";

export class sessionManager {
    static async save(sessionId: string, messages: Message[]): Promise<void> {
        const sessionsDir = path.resolve(
            path.dirname(fileURLToPath(import.meta.url)),
            "..",
            "sessions"
        );

        const filePath = `${sessionsDir}/${sessionId}.jsonl`;
        let content  = "";

        for (const message of messages) {
             content  += JSON.stringify(message) + "\n";
        }

        await writeFile(filePath, content, "utf8");
    }

}