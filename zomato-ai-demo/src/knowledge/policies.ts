import { SUPPORT_POLICIES, type SupportPolicy } from "../mock/data";

export { SUPPORT_POLICIES, type SupportPolicy };

export interface RAGRetrievalResult {
  query: string;
  matched_topic: string;
  policies: {
    title: string;
    content: string;
    conditions: string[];
  }[];
  tokens_used: number;
}

export function retrieveSupportPolicies(query: string): RAGRetrievalResult | null {
  const lower = query.toLowerCase();

  let matchedTopic: string | null = null;

  if (lower.includes("refund") || lower.includes("money back") || lower.includes("compensation")) {
    matchedTopic = "refund";
  } else if (lower.includes("cancel") || lower.includes("cancellation") || lower.includes("abort")) {
    matchedTopic = "cancellation";
  } else if (lower.includes("late") || lower.includes("delay") || lower.includes("delay policy") || lower.includes("where is")) {
    matchedTopic = "late_delivery";
  } else if (lower.includes("payment") || lower.includes("deducted") || lower.includes("failed") || lower.includes("charge")) {
    matchedTopic = "payment_failure";
  } else if (lower.includes("privacy") || lower.includes("card") || lower.includes("security") || lower.includes("credit card")) {
    matchedTopic = "data_privacy";
  }

  if (!matchedTopic) {
    return null;
  }

  const policies = SUPPORT_POLICIES.filter((p) => p.topic === matchedTopic || (matchedTopic === "late_delivery" && p.topic === "refund")).map((p) => ({
    title: p.title,
    content: p.content,
    conditions: p.conditions,
  }));

  return {
    query,
    matched_topic: matchedTopic,
    policies,
    tokens_used: 120, // RAG document retrieval tokens (separate from LLM output cost)
  };
}
