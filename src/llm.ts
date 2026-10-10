import type { LLM, LLMResponse, Message, Tool, TextDeltaHandler, ToolCall} from "./types.js";
import "dotenv/config";

/**
 * 流式响应中，单个工具调用的"增量片段"。
 * - index：这是第几个工具调用（模型可能一次调用多个工具，靠 index 区分）
 * - id / name：通常只在该工具调用的第一个片段里出现，后续片段没有
 * - arguments：JSON 字符串的碎片，需要按顺序拼接，拼完才是完整 JSON
 */
type ToolCallDelta = {
    index: number;
    id?: string;
    type?: "function";
    function?: { name?: string; arguments?: string };
};

/**
 * 每一行 `data: {...}` 解析出来的结构。
 * 只声明我们会用到的字段，其他字段（id、model、finish_reason 等）忽略。
 * 注意：非流式响应用的是 `message`，流式响应用的是 `delta`（只含增量）。
 */
type StreamChunk = {
    choices: Array<{
        delta: {
            content?: string | null;
            tool_calls?: ToolCallDelta[];
        };
    }>;
};

/**
 * 把一行 SSE 文本解析成 data 部分。
 * SSE 格式示例：
 *   data: {"choices":[...]}
 *   data: [DONE]
 *   : keep-alive          ← 以冒号开头的是注释/心跳，要忽略
 *   (空行)                ← 事件分隔符，要忽略
 * 返回 null 表示这一行不是数据行，调用方直接跳过即可。
 */
function parseDataLine(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return null;
    // "data:" 后面可能有空格也可能没有，统一 trim 掉
    return trimmed.slice("data:".length).trim();
}

/**
 * 异步生成器：持续读取响应体，每拿到一条完整的 data 就 yield 出去。
 * 调用方用 `for await (const data of readSSEData(body))` 消费即可。
 */
async function* readSSEData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const reader = body.getReader();
    // 网络传的是字节（Uint8Array），要用 TextDecoder 转成字符串
    const decoder = new TextDecoder();
    // buffer 用来暂存"还没凑成完整一行"的文本。
    // 原因：网络分包不会按行切，一个 chunk 可能截断在某行 JSON 中间，
    // 甚至截断在一个中文字符的多个字节之间。
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break; // 服务端关闭了连接，流结束

        // stream: true 告诉解码器"后面还有数据"，
        // 这样被截断的多字节字符（如中文）会留到下次再解码，不会出现乱码
        buffer += decoder.decode(value, { stream: true });

        // 按换行切分；最后一段可能是不完整的行，放回 buffer 等下一个 chunk 补全
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
            const data = parseDataLine(line);
            if (data === null) continue;   // 空行、注释行，跳过
            if (data === "[DONE]") return; // OpenAI 约定的结束标记
            yield data;
        }
    }
}

/**
 * 把本次收到的工具调用片段合并进累积结果 toolCalls。
 * 举例：模型调用 read_file({"path":"a.ts"})，可能分 3 次到达：
 *   1) { index:0, id:"call_1", function:{ name:"read_file", arguments:"" } }
 *   2) { index:0, function:{ arguments:"{\"pa" } }
 *   3) { index:0, function:{ arguments:"th\":\"a.ts\"}" } }
 * 合并后得到一个完整的 ToolCall。
 * 这里直接修改传入的数组（就地累积），所以没有返回值。
 */
function mergeToolCallDeltas(toolCalls: ToolCall[], deltas: ToolCallDelta[]): void {
    for (const delta of deltas) {
        // 第一次见到这个 index，先建一个空壳
        const call = (toolCalls[delta.index] ??= {
            id: "",
            type: "function",
            function: { name: "", arguments: "" },
        });

        // id 只会出现一次，有就直接赋值
        if (delta.id) call.id = delta.id;
        // name 一般也只出现一次；用 += 是为了兼容少数把 name 也分片发送的服务
        if (delta.function?.name) call.function.name += delta.function.name;
        // arguments 是 JSON 碎片，必须按顺序拼接
        if (delta.function?.arguments) call.function.arguments += delta.function.arguments;
    }
}


export class OpenAICompatibleLLM implements LLM {
    constructor(
        private readonly apiKey = process.env.OPENAI_API_KEY,
        private readonly model = process.env.OPENAI_MODEL ?? "gpt-5",
        private readonly baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    ) {
        if (!apiKey) {
            throw new Error("请先设置 OPENAI_API_KEY 环境变量");
        }
    }

    async chat(messages: Message[], tools: Tool[], onTextDelta?: TextDeltaHandler): Promise<LLMResponse> {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                tools: tools.map((tool) => ({
                    type: "function",
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters,
                    },
                })),
                tool_choice: tools.length > 0 ? "auto" : "none",
                stream: true
            }),
        });

        if (!response.ok) {
            throw new Error(`LLM 请求失败：${response.status} ${await response.text()}`);
        }
        // 流式模式下必须有 body，否则无从读取
        if (!response.body) {
            throw new Error("LLM 响应没有 body，无法读取流。");
        }

        // 两个累积器：最终要拼出一个完整的 assistant 消息
        let content = "";
        const toolCalls: ToolCall[] = [];

        for await (const data of readSSEData(response.body)) {
            const chunk = JSON.parse(data) as StreamChunk;
            // 有些服务会发 choices 为空数组的块（比如最后附带 usage 统计），要容错
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
                content += delta.content;
                // 实时把增量交给调用方（比如打印到终端）。
                // 用 await 是因为回调类型允许返回 Promise
                await onTextDelta?.(delta.content);
            }
            if (delta.tool_calls) {
                mergeToolCallDeltas(toolCalls, delta.tool_calls);
            }
        }

        return {
            message: {
                role: "assistant",
                // 纯工具调用时模型不输出文本，按 OpenAI 约定 content 应为 null
                content: content || null,
                // 没有工具调用就不带这个字段；
                // 带空数组 tool_calls: [] 回传给 API，部分兼容服务会报 400
                ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
            },
        };

    }
}