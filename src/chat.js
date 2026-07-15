// Luna's brain: tries the Claude-powered /api/ask endpoint first; if the
// server has no API key it falls back to the topic's built-in Q&A bank.

export function localAnswer(topic, question) {
  const q = question.toLowerCase();
  for (const entry of topic.qa || []) {
    if (entry.k.some((kw) => q.includes(kw))) return entry.a;
  }
  const fact = topic.facts[Math.floor(Math.random() * topic.facts.length)];
  return `Ooh, great question! Here is something amazing I know: ${fact}`;
}

export async function askLuna(topic, question) {
  try {
    const r = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topicName: topic.name, facts: topic.facts, question })
    });
    if (r.ok) {
      const data = await r.json();
      if (data.reply) return data.reply;
    }
  } catch {
    // fall through to local answers
  }
  return localAnswer(topic, question);
}
