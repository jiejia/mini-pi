import { EventEmitter } from 'node:events';

const emitter = new EventEmitter();

const listeners = {
    'llm-tool-call': [
     ],
    'llm-respond': [
     ]
};

for (const [key, value] of Object.entries(listeners)) {
    emitter.on(key, (name: string) => {
        console.log(`函数 3：欢迎你，${name}！`);
    });
}

export default emitter;
