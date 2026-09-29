import { readFile } from "node:fs/promises";
import type { Tool } from "../types.js";

export const readFileTool:Tool = {
    name: "read_file",

    description: "Read the contents of a file.",

    parameters: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "Path of the file to read",
            },
        },
        required: ["path"],
        additionalProperties: false,
    },

    async execute(args: { path: string }) {
        return await readFile(args.path, "utf8");
    },
};