import { readFile, writeFile } from "node:fs/promises";
import type { Tool } from "../types.js";


export const editFileTool: Tool = {
    name: "edit_file",

    description: "Replace exact text in a file.",

    parameters: {
        type: "object",
        properties: {
            path: { type: "string" },
            oldText: { type: "string" },
            newText: { type: "string" },
        },
        required: ["path", "oldText", "newText"],
        additionalProperties: false,
    },

    async execute(args: {
        path: string;
        oldText: string;
        newText: string;
    }) {
        const content = await readFile(args.path, "utf8");

        if (!content.includes(args.oldText)) {
            throw new Error("oldText was not found in the file");
        }

        const updated = content.replace(args.oldText, args.newText);
        await writeFile(args.path, updated, "utf8");

        return `Successfully edited ${args.path}`;
    },
};