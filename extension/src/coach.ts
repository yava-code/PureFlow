import * as vscode from "vscode";
import type { MentorRequest, MentorResponse, MentorSection, RepState } from "./types";

const keyName = "pureflow.coachApiKey";

export class Coach {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async configured(): Promise<boolean> {
    if (!vscode.workspace.isTrusted) return false;
    const config = vscode.workspace.getConfiguration("pureflow");
    return Boolean(config.get<string>("coachEndpoint") && config.get<string>("coachModel") && (await this.context.secrets.get(keyName)));
  }

  async configure(): Promise<boolean> {
    const currentEndpoint = vscode.workspace.getConfiguration("pureflow").get<string>("coachEndpoint") ?? "";
    const currentModel = vscode.workspace.getConfiguration("pureflow").get<string>("coachModel") ?? "";
    const preset = await vscode.window.showQuickPick(
      [
        {
          label: "Groq",
          description: "OpenAI-compatible cloud endpoint",
          endpoint: "https://api.groq.com/openai/v1/chat/completions",
          model: "llama-3.3-70b-versatile",
        },
        {
          label: "OpenAI",
          description: "api.openai.com",
          endpoint: "https://api.openai.com/v1/chat/completions",
          model: "gpt-4o-mini",
        },
        {
          label: "Custom OpenAI-compatible",
          description: "Any chat completions URL (Ollama, proxy, etc.)",
          endpoint: currentEndpoint || "http://127.0.0.1:11434/v1/chat/completions",
          model: currentModel || "",
        },
      ],
      {
        title: "PureFlow Coach preset",
        placeHolder: "Coach is never called during an active Focus Rep. API key goes to SecretStorage.",
        ignoreFocusOut: true,
      },
    );
    if (!preset) return false;

    const endpoint = await vscode.window.showInputBox({
      title: "PureFlow Coach endpoint",
      prompt: "OpenAI-compatible chat completions URL. Never called during an active Focus Rep.",
      value: preset.endpoint,
      ignoreFocusOut: true,
    });
    if (!endpoint) return false;
    const model = await vscode.window.showInputBox({
      title: "PureFlow Coach model",
      prompt: "Model identifier accepted by your endpoint (for Groq, use a current Groq model id).",
      value: preset.model || currentModel,
      ignoreFocusOut: true,
    });
    if (!model) return false;
    const apiKey = await vscode.window.showInputBox({
      title: "PureFlow Coach API key",
      password: true,
      prompt: "Stored only in VS Code SecretStorage — not in settings.json or the repository.",
      ignoreFocusOut: true,
    });
    if (!apiKey) return false;

    const config = vscode.workspace.getConfiguration("pureflow");
    await config.update("coachEndpoint", endpoint.trim(), vscode.ConfigurationTarget.Global);
    await config.update("coachModel", model.trim(), vscode.ConfigurationTarget.Global);
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

  async mentor(rep: RepState, request: MentorRequest): Promise<MentorResponse> {
    if (rep.phase === "active") throw new Error("Mentor requests are disabled during an active Focus Rep.");
    if (!(await this.configured())) return localMentor(request);

    const config = vscode.workspace.getConfiguration("pureflow");
    const endpoint = config.get<string>("coachEndpoint")!;
    const model = config.get<string>("coachModel")!;
    const apiKey = await this.context.secrets.get(keyName);
    const response = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: request.mode === "quiz" ? 0.45 : 0.15,
        messages: [
          {
            role: "system",
            content: mentorPrompt(request.mode),
          },
          {
            role: "user",
            content: [
              `Language: ${request.language}`,
              `File: ${request.file || "current editor"}`,
              `Lines: ${request.startLine}-${request.endLine}`,
              request.question ? `Developer reasoning: ${request.question}` : "",
              "Selected code:",
              request.code.slice(0, 16_000),
            ].filter(Boolean).join("\n"),
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) throw new Error(`Coach endpoint returned ${response.status}.`);
    const result = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = result.choices?.[0]?.message?.content;
    if (!content || content.includes("```")) throw new Error("Coach returned an invalid structured response.");
    return parseMentorResponse(content, request.mode);
  }
}

function mentorPrompt(mode: MentorRequest["mode"]): string {
  const intent = {
    explain: "Explain control flow, state changes, invariants, and edge cases in the selected code.",
    why: "Infer plausible design reasons and tradeoffs. Clearly distinguish evidence from inference.",
    quiz: "Write 3-5 concise questions that test understanding. Do not include answers.",
    review: "Review the developer's reasoning against the code. Identify sound claims, gaps, and one next check.",
  }[mode];
  return [
    "You are a concise senior engineer mentoring inside an IDE.",
    intent,
    "Do not generate a patch, replacement code, or markdown.",
    "Return JSON: {title, summary, sections:[{title, points:string[]}]}. Use at most 3 sections and 4 points per section.",
  ].join(" ");
}

function parseMentorResponse(content: string, mode: MentorRequest["mode"]): MentorResponse {
  const parsed = JSON.parse(content) as { title?: unknown; summary?: unknown; sections?: unknown };
  const sections = Array.isArray(parsed.sections)
    ? parsed.sections.flatMap((value): MentorSection[] => {
        if (!value || typeof value !== "object") return [];
        const section = value as { title?: unknown; points?: unknown };
        if (typeof section.title !== "string" || !Array.isArray(section.points)) return [];
        const points = section.points
          .filter((point): point is string => typeof point === "string")
          .map((point) => point.trim().slice(0, 420))
          .filter(Boolean)
          .slice(0, 4);
        return points.length ? [{ title: section.title.trim().slice(0, 80), points }] : [];
      }).slice(0, 3)
    : [];
  if (typeof parsed.title !== "string" || typeof parsed.summary !== "string" || !sections.length) {
    throw new Error("Coach returned an incomplete structured response.");
  }
  return {
    mode,
    title: parsed.title.trim().slice(0, 100),
    summary: parsed.summary.trim().slice(0, 900),
    sections,
    source: "configured coach",
  };
}

function localMentor(request: MentorRequest): MentorResponse {
  const code = request.code;
  const signature = code.split(/\r?\n/).find((line) => /(?:function|=>|\bclass\b|\bdef\b|\bfn\b)/.test(line))?.trim();
  const branches = (code.match(/\b(?:if|else if|switch|case|match|catch)\b/g) ?? []).length;
  const asyncWork = /\b(?:async|await|Promise|Future)\b/.test(code);
  const mutations = (code.match(/(?:\+\+|--|\+=|-=|\.(?:set|delete|push|pop|splice)\s*\()/g) ?? []).length;
  const exits = (code.match(/\b(?:return|throw|break|continue)\b/g) ?? []).length;

  if (request.mode === "quiz") {
    return {
      mode: request.mode,
      title: "Questions for this selection",
      summary: "A local, code-shaped quiz. Answers stay hidden so you can reason from the source.",
      source: "local guide",
      sections: [{
        title: "Quiz",
        points: [
          `What must be true before ${signature ? `“${signature.slice(0, 90)}”` : "this block"} runs successfully?`,
          branches ? `Which of the ${branches} branch points is easiest to miss in a test?` : "Where does control leave this selection, and what does each exit mean?",
          asyncWork ? "What can change between the asynchronous steps, and how are failures surfaced?" : "Which state is read, and which state can this selection change?",
          "What is the smallest test that would disprove your current understanding?",
        ],
      }],
    };
  }

  const facts = [
    branches ? `${branches} explicit branch point${branches === 1 ? "" : "s"}.` : "No explicit conditional branch in the selected range.",
    exits ? `${exits} explicit control-flow exit${exits === 1 ? "" : "s"}.` : "Control falls through the selected range.",
    mutations ? `${mutations} likely state mutation${mutations === 1 ? "" : "s"}.` : "No obvious collection or increment mutation detected.",
    asyncWork ? "The selection participates in asynchronous work." : "No async boundary is visible in the selection.",
  ];
  const modeCopy = {
    explain: {
      title: "Selection map",
      summary: "This is a deterministic local reading of visible control flow, not a model-generated explanation.",
      section: "What is visible",
    },
    why: {
      title: "Likely design pressures",
      summary: "Without project history, intent is an inference. Use these prompts to test the design against callers and tests.",
      section: "Evidence and inference",
    },
    review: {
      title: "Reasoning check",
      summary: request.question?.trim()
        ? "Compare your explanation with the visible exits, mutations, and asynchronous boundaries below."
        : "Add your reasoning to compare it with the visible code. The local guide does not invent author intent.",
      section: "Checks",
    },
  }[request.mode];
  return {
    mode: request.mode,
    title: modeCopy.title,
    summary: modeCopy.summary,
    source: "local guide",
    sections: [
      { title: modeCopy.section, points: facts },
      {
        title: "Next check",
        points: request.mode === "why"
          ? ["Inspect callers, tests, and version history before treating a plausible tradeoff as the author's intent."]
          : ["Trace one normal input and one failure input through the selection, then confirm both with a test or debugger."],
      },
    ],
  };
}

function fallbackQuestions(rep: RepState): string[] {
  return [
    `What invariant did your work on “${rep.goal}” restore or introduce?`,
    "Which test or observation gives the strongest evidence that the behavior is correct?",
    "What edge case is still least certain, and how would you make it fail deliberately?",
    "What tradeoff did you choose, and what future change would make you revisit it?",
  ];
}
