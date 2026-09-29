import { writeFile } from "node:fs/promises";
import type { Tool } from "../types.js";


export const writeFileTool: Tool = {
    name: "write_file",

    description: "Create or overwrite a file.",

    parameters: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "Path of the file",
            },
            content: {
                type: "string",
                description: "Content to write",
            },
        },
        required: ["path", "content"],
        additionalProperties: false,
    },

    async execute(args: { path: string; content: string }) {
        await writeFile(args.path, args.content, "utf8");
        return `Successfully wrote ${args.path}`;
    },
};