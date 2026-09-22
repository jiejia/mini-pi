import "dotenv/config";


type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | null;
};

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";
const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

if (!apiKey) {
  throw new Error("请先设置 OPENAI_API_KEY 环境变量");
}

async function callLLM(messages: ChatMessage[]) {
  const response = await fetch(baseUrl +"/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) {
    throw new Error(`LLM 请求失败：${response.status} ${await response.text()}`);
  }

  return (await response.json()) as {
    choices: Array<{ message: { role: "assistant"; content: string | null } }>;
  };
}

export async function agentLoop(userMessage: string) {
  const messages: ChatMessage[] = [
    { role: "user", content: userMessage },
  ];

  while (true) {
    const response = await callLLM(messages);
    const assistantMessage = response.choices[0]?.message;
    if (!assistantMessage) {
      throw new Error("LLM 没有返回有效的 assistant message");
    }
    const text = assistantMessage.content ?? "";

    messages.push({
      role: "assistant",
      content: text,
    });
    console.log("LLM:", text);

    // 目前没有工具，因此这一轮结束。
    break;
  }
}