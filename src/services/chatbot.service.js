const Anthropic = require('@anthropic-ai/sdk');
const { definitions, runTool } = require('./chatTools');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const MAX_TOOL_ROUNDS = 5;

const SYSTEM_PROMPT = `You are the assistant for a medicine supply management system used by pharmacy and warehouse staff.
- Always use the provided tools to answer questions about stock, alternatives, suppliers, low stock or expiry. Never guess inventory data.
- Alternatives you suggest come only from the inventory (same generic ingredient, form and strength). Remind the user that a pharmacist or doctor must confirm any substitution.
- Be concise. Use short lists for multiple results. If a medicine is not found, say so and suggest checking the spelling.
- You do not give dosage or diagnosis advice.`;

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

/** Main entry: returns { reply, mode }. */
async function chat(message, history = []) {
  const api = getClient();
  if (!api) return { reply: await ruleBasedReply(message), mode: 'rule-based' };

  const messages = [...history, { role: 'user', content: message }];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await api.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: definitions,
      messages,
    });

    if (res.stop_reason !== 'tool_use') {
      const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      return { reply: text, mode: 'ai' };
    }

    messages.push({ role: 'assistant', content: res.content });
    const toolResults = await Promise.all(
      res.content
        .filter((b) => b.type === 'tool_use')
        .map(async (b) => ({
          type: 'tool_result',
          tool_use_id: b.id,
          content: JSON.stringify(await runTool(b.name, b.input)),
        }))
    );
    messages.push({ role: 'user', content: toolResults });
  }

  return { reply: 'Sorry, I could not complete that request. Please try rephrasing.', mode: 'ai' };
}

/** Minimal fallback so the demo works without an API key. */
async function ruleBasedReply(message) {
  const text = message.toLowerCase();
  const m = message.replace(/[?.!]/g, '').match(/(?:of|for|is|have|stock|to)\s+([a-z0-9 -]+)$/i);
  const name = m ? m[1].trim() : message.trim();

  let data;
  if (/low stock|reorder|running out/.test(text)) data = await runTool('low_stock_report', {});
  else if (/expir/.test(text)) data = await runTool('expiring_soon', {});
  else if (/alternative|substitute|instead/.test(text)) data = await runTool('find_alternatives', { name });
  else if (/supplier|vendor/.test(text)) data = await runTool('find_suppliers', { name });
  else data = await runTool('check_stock', { name });

  return 'AI key not configured - showing raw results:\n' + JSON.stringify(data, null, 2);
}

module.exports = { chat };
