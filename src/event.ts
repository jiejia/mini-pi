import { EventEmitter } from 'node:events';

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
     ]
};

for (const [key, callbacks] of Object.entries(listeners)) {
    for (const callback of callbacks) {
        emitter.on(key, callback);
    }
}

export default emitter;
