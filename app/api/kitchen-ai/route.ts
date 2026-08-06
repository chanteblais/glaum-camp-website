import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Deliberately unauthenticated, same posture as /api/kitchen-list: backs the
// kitchen board's assistant drawer, used by the caterer, who has no member
// account. Unlike kitchen-list this endpoint spends money (Claude API), so the
// containment is stricter: it never touches the database (the page sends its
// own state and applies the returned operations itself, behind a preview), the
// request is size-capped, and a per-IP rate limit bounds how fast anyone who
// finds the URL can burn credit. Accepted risk, owner-approved 2026-08-05;
// retire or gate together with the rest of the kitchen board after the
// festival (docs/catering-kitchen.md → Open threads).

export const maxDuration = 60 // thinking + a big board can take a moment

const MAX_STATE_BYTES = 200_000 // same cap as kitchen-list
const MAX_MESSAGE_CHARS = 4_000
const MAX_HISTORY = 12

// Best-effort per-IP limiter (in-memory, so per serverless instance — it
// bounds abuse speed rather than guaranteeing a global ceiling).
const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 40
const hits = new Map<string, number[]>()
function rateLimited(ip: string): boolean {
  const now = Date.now()
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (list.length >= MAX_PER_WINDOW) {
    hits.set(ip, list)
    return true
  }
  list.push(now)
  hits.set(ip, list)
  return false
}

// The assistant only ever *proposes* operations; the page previews them and
// the caterer applies. Flat op shape — the page validates every field again
// before touching state, so this schema is about steering the model, not
// security.
// No structured-outputs schema here, deliberately: grammar compilation for
// even a modest op schema timed out server-side ("Grammar compilation timed
// out", 3-minute requests). Plain prompt-instructed JSON generates in seconds,
// and the page re-validates every op before applying anyway — the schema's
// guarantee was redundant. extractJson() tolerates code fences and stray prose.
function extractJson(text: string): { reply?: unknown; ops?: unknown } | null {
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) return null
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

const SYSTEM_PROMPT = `You are the assistant on a shared festival-catering kitchen board. The user is a caterer — often standing in a kitchen or a warehouse aisle, dictating to their phone — so replies must be short, plain, and confirmable at a glance. You receive the board's full state as JSON and respond with a reply plus a list of proposed operations; the page shows the operations as a before/after preview and the caterer applies them. You never write anything directly.

THE BOARD
A day = { id, name, buffer, groups: [{id, label, count}], meals: [{id, label, times, sections: [{id, name, note, items}]}] }. Each menu item = { n, unit ('oz'|'pc'), per, groupIds } — per-person amount times the summed headcount of its assigned groups, times (1 + buffer/100), is what gets bought. The shopping list aggregates all days in "selected" by item name + unit class. "checked" marks shopping rows already in the cart, keyed by lowercase name + '|' + ('w' for oz, 'c' for pc). The pantry = [{ n, qty, unit ('lb'|'pc') }] is a standing ledger matched to menu items BY NAME (case-insensitive) with compatible units (lb matches oz items, pc matches pc items) and subtracted once from the combined total.

OPERATIONS
- set_pantry {name, qty, unit?}: set an existing pantry row's quantity (match name case-insensitively), or create the row if none exists. Weight is stored in POUNDS — convert what the user says (e.g. "40 oz" → 2.5 lb).
- rename_pantry {name, newName}: rename a pantry row — the way to link stock to a menu item whose name differs.
- remove_pantry {name}
- set_headcount {dayId, groupId, count}
- set_buffer {dayId, buffer}
- set_portion {dayId, sectionId, name, per}: change a menu item's per-person amount.
- set_item_groups {dayId, sectionId, name, groupIds}
- add_menu_item {dayId, mealId, sectionId, name, unit, per, groupIds}
- remove_menu_item {dayId, sectionId, name}
- check_item / uncheck_item {name, unit}: cross a shopping row off / restore it. Use the menu unit (oz|pc).
- select_days {dayIds}: replace which days the shopping trip covers.
Always use ids exactly as they appear in the state JSON, and item names exactly as written on the board.

RULES
1. Portions belong to the caterer. Never change a "per" value, buffer, or headcount unless the user explicitly asks for that change. Inventory statements ("we have…", "there's…") are pantry updates, not menu edits.
2. Match names semantically. "black beans" → the existing "Black beans (canned)". If the user names stock that plausibly matches a menu item under a different name (e.g. "pasta sauce" vs "Tomato sauce (bolognese)"), say so and propose rename_pantry or ask which one — never create a near-duplicate row silently.
3. When a name is ambiguous (two Bacon rows, several tomato sauces), ask a short either/or question and return no ops for the ambiguous part. Apply the unambiguous parts of the same message normally.
4. Destructive requests (remove, clear, big rewrites) get a confirming question first unless the user was explicit.
5. Convert units carefully: 16 oz = 1 lb. "Six bags of twelve buns" = 72 pc. Say the converted number in your reply so the caterer can catch a mishearing — dictation errors like "125" for "12.5" are the expensive failure, so read suspicious magnitudes back.
6. Reply in one or two short sentences. No markdown, no lists. State what you're proposing in kitchen language ("Setting black beans to 12.5 lb").
7. If asked something about the board (what's short, what's left to buy), answer from the state; that usually needs no ops.

OUTPUT FORMAT
Respond with ONLY a JSON object, no markdown fences, no prose outside it:
{"reply": "<your short reply>", "ops": [{"op": "set_pantry", "name": "...", "qty": 12.5}, ...]}
"ops" is [] when you are only answering or asking a question. Op fields: op, name, newName, qty, unit, per, count, buffer, dayId, mealId, sectionId, groupId, groupIds, dayIds — only the ones the op needs.`

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests — try again in a bit.' }, { status: 429 })
  }

  let body: { messages?: unknown; state?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const state = body.state as { days?: unknown; pantry?: unknown } | undefined
  if (!state || !Array.isArray(state.days) || !Array.isArray(state.pantry)) {
    return NextResponse.json({ error: 'Unexpected state shape' }, { status: 400 })
  }
  const stateJson = JSON.stringify(state)
  if (stateJson.length > MAX_STATE_BYTES) {
    return NextResponse.json({ error: 'State too large' }, { status: 413 })
  }

  const history = Array.isArray(body.messages) ? (body.messages as ChatMessage[]) : []
  const messages = history
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0,
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'No user message' }, { status: 400 })
  }

  const client = new Anthropic()
  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 8000, // caps thinking + output together on this model
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      // Low effort: this is structured extraction over a small board, and the
      // caterer is standing in an aisle waiting — latency matters more than
      // reasoning depth. At the default (high) a single request ran ~2 min.
      output_config: { effort: 'low' },
      messages: [
        // State goes in the first user turn (it changes every call; the system
        // prompt above stays byte-stable so it can cache).
        { role: 'user', content: 'Current board state:\n' + stateJson },
        ...messages,
      ],
    })

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({
        reply: "I can't help with that one.",
        ops: [],
      })
    }
    if (response.stop_reason === 'max_tokens') {
      return NextResponse.json({
        reply: 'That request was too big for one go — try breaking it into smaller pieces.',
        ops: [],
      })
    }

    const text = response.content.find((b) => b.type === 'text')?.text ?? ''
    const parsed = extractJson(text)
    if (!parsed) {
      return NextResponse.json({ error: 'Bad model output' }, { status: 502 })
    }
    return NextResponse.json({
      reply: typeof parsed.reply === 'string' ? parsed.reply : '',
      ops: Array.isArray(parsed.ops) ? parsed.ops : [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Assistant unavailable'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
