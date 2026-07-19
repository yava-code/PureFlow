import * as vscode from "vscode";
import type { RepState } from "./types";

const keyName = "pureflow.coachApiKey";

export class Coach {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async configured(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration("pureflow");
    return Boolean(config.get<string>("coachEndpoint") && config.get<string>("coachModel") && (await this.context.secrets.get(keyName)));
  }

  async configure(): Promise<boolean> {
    const endpoint = await vscode.window.showInputBox({
      title: "PureFlow Coach endpoint",
      prompt: "OpenAI-compatible chat completions endpoint. It is never called during Pure Mode.",
      value: vscode.workspace.getConfiguration("pureflow").get<string>("coachEndpoint") ?? "",
      ignoreFocusOut: true,
    });
    if (!endpoint) return false;
    const model = await vscode.window.showInputBox({
      title: "PureFlow Coach model",
      prompt: "Model identifier accepted by your endpoint.",
      value: vscode.workspace.getConfiguration("pureflow").get<string>("coachModel") ?? "",
      ignoreFocusOut: true,
    });
    if (!model) return false;
    const apiKey = await vscode.window.showInputBox({
      title: "PureFlow Coach API key",
      password: true,
      prompt: "Stored only in VS Code SecretStorage.",
      ignoreFocusOut: true,
    });
    if (!apiKey) return false;

    const config = vscode.workspace.getConfiguration("pureflow");
    await config.update("coachEndpoint", endpoint, vscode.ConfigurationTarget.Global);
    await config.update("coachModel", model, vscode.ConfigurationTarget.Global);
    await this.context.secrets.store(keyName, apiKey);
    return true;
  }

  async questions(rep: RepState, context: string): Promise<string[]> {
    if (rep.phase === "active") throw new Error("Coach requests are disabled during an active Rep.");
    if (!(await this.configured())) return fallbackQuestions(rep);

    const config = vscode.workspace.getConfiguration("pureflow");
    const endpoint = config.get<string>("coachEndpoint")!;
    const model = config.get<string>("coachModel")!;
    const apiKey = await this.context.secrets.get(keyName);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a senior reviewer running a short defense after a manual coding practice session. Return JSON with a questions array of 3-5 concise questions. Ask about invariants, edge cases, tests, and tradeoffs. Do not provide code, patches, answers, or markdown fences.",
          },
          {
            role: "user",
            content: `Goal: ${rep.goal}\nOutcome: ${rep.outcome}\nShared context:\n${context.slice(0, 24_000)}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) throw new Error(`Coach endpoint returned ${response.status}.`);
    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = result.choices?.[0]?.message?.content;
    if (!content || content.includes("```")) return fallbackQuestions(rep);
    const parsed = JSON.parse(content) as { questions?: unknown };
    if (!Array.isArray(parsed.questions)) return fallbackQuestions(rep);
    const questions = parsed.questions
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().slice(0, 280))
      .filter(Boolean)
      .slice(0, 5);
    return questions.length >= 3 ? questions : fallbackQuestions(rep);
  }
}

function fallbackQuestions(rep: RepState): string[] {
  return [
    `What invariant did your work on “${rep.goal}” restore or introduce?`,
    "Which test or observation gives the strongest evidence that the behavior is correct?",
    "What edge case is still least certain, and how would you make it fail deliberately?",
    "What tradeoff did you choose, and what future change would make you revisit it?",
  ];
}

