import type { KnowledgeResult } from "./types";

const localDocs: KnowledgeResult[] = [
  {
    id: "node-abortsignal-timeout",
    title: "AbortSignal.timeout(delay)",
    source: "Node.js documentation",
    url: "https://nodejs.org/api/globals.html#static-method-abortsignaltimeoutdelay",
    detail: "nodejs.org · Globals",
    version: "Node.js 20+",
    excerpt: "Returns an AbortSignal that becomes aborted after the given delay in milliseconds.",
    kind: "official",
  },
  {
    id: "mdn-abortsignal-timeout",
    title: "AbortSignal: timeout() static method",
    source: "MDN Web Docs",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static",
    detail: "developer.mozilla.org · Web APIs",
    excerpt: "Creates a signal that aborts automatically after a specified time.",
    kind: "reference",
  },
  {
    id: "ts-satisfies",
    title: "The satisfies operator",
    source: "TypeScript handbook",
    url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator",
    detail: "typescriptlang.org · TypeScript 4.9",
    version: "TypeScript 4.9+",
    excerpt: "Validate an expression against a type without changing the resulting expression type.",
    kind: "official",
  },
  {
    id: "node-test-runner",
    title: "Node.js test runner",
    source: "Node.js documentation",
    url: "https://nodejs.org/api/test.html",
    detail: "nodejs.org · Test runner",
    version: "Node.js 20+",
    excerpt: "The node:test module facilitates the creation of JavaScript tests.",
    kind: "official",
  },
  {
    id: "mdn-promise-allsettled",
    title: "Promise.allSettled()",
    source: "MDN Web Docs",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled",
    detail: "developer.mozilla.org · JavaScript reference",
    excerpt: "Wait for every input promise to settle and preserve each result status.",
    kind: "reference",
  },
];

export async function searchKnowledge(query: string): Promise<KnowledgeResult[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return localDocs.slice(0, 4);
  const local = localDocs
    .map((item) => ({
      item,
      score: `${item.title} ${item.source} ${item.excerpt}`.toLowerCase().includes(needle) ? 1 : 0,
    }))
    .filter(({ score }) => score)
    .map(({ item }) => item);

  try {
    const community = await searchStackOverflow(query);
    return [...local, ...community].slice(0, 6);
  } catch {
    return local.length ? local : localDocs.slice(0, 3);
  }
}

async function searchStackOverflow(query: string): Promise<KnowledgeResult[]> {
  const params = new URLSearchParams({
    site: "stackoverflow",
    q: query,
    pagesize: "3",
    order: "desc",
    sort: "votes",
    filter: "default",
  });
  const response = await fetch(`https://api.stackexchange.com/2.3/search/advanced?${params}`);
  if (!response.ok) throw new Error(`Stack Exchange returned ${response.status}`);
  const data = (await response.json()) as {
    items?: Array<{
      question_id: number;
      title: string;
      link: string;
      score: number;
      is_answered: boolean;
      tags: string[];
      last_activity_date: number;
    }>;
  };
  return (data.items ?? []).map((item) => ({
    id: `so-${item.question_id}`,
    title: decodeEntities(item.title),
    source: "Stack Overflow",
    url: item.link,
    detail: `stackoverflow.com · score ${item.score} · ${item.is_answered ? "answered" : "open"}`,
    version: new Date(item.last_activity_date * 1000).toLocaleDateString("en-CA"),
    excerpt: item.tags.slice(0, 4).join(" · "),
    kind: "community" as const,
  }));
}

function decodeEntities(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

