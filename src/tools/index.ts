import { readFileTool } from "./read-file.js";
import { writeFileTool } from "./write-file.js";
import { editFileTool } from "./edit-file.js";
import { bashTool } from "./bash.js";
import type { Tool } from "../types.js";

export const tools : Tool[] = [
    readFileTool,
    writeFileTool,
    editFileTool,
    bashTool,
];