import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Tool } from "../types.js";

const execAsync = promisify(exec);

export const bashTool: Tool = {
    name: "bash",

    description: "Execute a shell command in the current project directory.",

    parameters: {
        type: "object",
        properties: {
            command: {
                type: "string",
                description: "Shell command to execute",
            },
        },
        required: ["command"],
        additionalProperties: false,
    },

    async execute(args: { command: string }) {
        try {
            const { stdout, stderr } = await execAsync(args.command, {
                cwd: process.cwd(),
                maxBuffer: 1024 * 1024 * 10,
            });

            return [stdout, stderr ? `STDERR:\n${stderr}` : ""]
                .filter(Boolean)
                .join("\n");
        } catch (error: any) {
            return [
                `Command failed with exit code ${error.code}`,
                error.stdout,
                error.stderr,
            ]
                .filter(Boolean)
                .join("\n");
        }
    },
};