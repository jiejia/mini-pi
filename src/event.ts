import { EventEmitter } from 'node:events';
import {sessionManager} from "./session-manager.ts";
import type { Message } from "./types.js";


const emitter = new EventEmitter();

type listenersType = {
    [event: string]: Array<(...args: any[]) => void>;
};

const listeners: listenersType = {
    'agent.prompt.tool_call.after': [
        (name:string, args:string) => console.log(`[tool] ${name} [args] ${args}`),
     ],
    'agent.prompt.llm.chat': [
        (delta:string) => process.stdout.write(delta),
     ],
    'agent.prompt.llm.chat.newline': [
        (delta:string) => process.stdout.write("\n"),
    ],
    'agent.prompt.llm.chat.after': [
        (sessionId:string, messages:Message[]) => sessionManager.save(sessionId, messages).catch((error) => {
            console.error("保存 session 失败：", error);
        })
    ]
};

for (const [key, callbacks] of Object.entries(listeners)) {
    for (const callback of callbacks) {
        emitter.on(key, callback);
    }
}

export default emitter;
