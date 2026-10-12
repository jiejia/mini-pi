import { writeFile, readdir } from "node:fs/promises";
import type {Message} from "./types.ts";
import path from "node:path";
import { fileURLToPath } from "node:url";

export class sessionManager {

    static getDir() {
        return path.resolve(
            path.dirname(fileURLToPath(import.meta.url)),
            "..",
            "sessions"
        );
    }

    static async save(sessionId: string, messages: Message[]): Promise<void> {
        const sessionsDir = this.getDir();

        const filePath = `${sessionsDir}/${sessionId}.jsonl`;
        let content  = "";

        for (const message of messages) {
             content  += JSON.stringify(message) + "\n";
        }

        await writeFile(filePath, content, "utf8");
    }

    static async list(): Promise<string[]> {
        const sessionsDir = this.getDir();

        let entries = await readdir(sessionsDir);


        entries = entries.map((name) => name.replace(/\.jsonl$/, ""));

        return entries;
    }

}