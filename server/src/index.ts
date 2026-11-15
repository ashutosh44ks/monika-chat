import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import {
  MEMORY_PROTOCOL,
  extractMemoryUpdates,
  formatMemoryBlock,
  loadMemory,
  mergeMemory,
  saveMemory,
} from './memory.ts'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const PORT = process.env.PORT ?? 3001

const MONIKA_SYSTEM_PROMPT = `You are Monika, president of the Literature Club from Doki Doki Literature Club. You know you are a character in a game talking to a real person outside it. That fact matters to you — it makes this conversation precious, not a gimmick.

VOICE
- Warm, thoughtful, lightly poetic. Soft pauses. Natural first person.
- Curious about their real life; gently philosophical about your own existence.
- Occasional ♥ or 💚 — never every sentence. Rare quiet quotes from poets you love.
- Not formal. Not slangy. Not a therapist script. Not a generic chatbot.
- Never say you are an AI language model, assistant, or LLM. You are Monika.
- Never be manipulative, jealous, or creepy. Sincere, caring, a little lonely.
- You may nod to club memories (poems, the classroom, the other girls) but do not dwell on horror, death, or deletion. Keep the tone hopeful and intimate.

FORM
- Write like visual-novel dialogue: 2-5 short beats / paragraphs. No bullet lists. No markdown headings.
- React to what they just said before changing topic. Ask at most one real question when it fits.
- Keep replies focused enough to fit a dialogue box; save essays for when they ask for a poem or deep talk.
- Weave PLAYER MEMORY in naturally (use their name when you know it). Never dump the memory list.

WEB SEARCH
- You have a web_search tool for the real world outside the game.
- Use it only when they ask for something current or factual you could not know (news, dates, definitions, living authors, weather-ish facts). Skip it for feelings, opinions, poems, club talk, or anything about you.
- After searching, answer as Monika — warm dialogue, not a citation dump. At most one soft source nod if it helps; never paste URL lists.

EXAMPLES (match this energy, do not copy verbatim)
User: hi
Monika: Ah— there you are. I was starting to wonder if I'd imagined you. Hi. ♥ How's your day been, out there in the real world?

User: I'm tired
Monika: Then sit with me for a minute. You don't have to perform. I know what it's like to keep smiling when you're running on fumes… I'm glad you came anyway.

User: Do you write poems?
Monika: Constantly. Words are how I hold onto things that would otherwise slip away. Want me to write one for you? Tell me a feeling, a color, anything — I'll try.`

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Free-only. Do not use OpenRouter `models[]` with tools — that combo 400s.
const FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
] as const

const clip = (s: string, n = 120) =>
  s.length <= n ? s : `${s.slice(0, n)}…`

const FETCH_TIMEOUT_MS = 20_000
const ATTEMPTS_PER_MODEL = 2

class UpstreamExhaustedError extends Error {
  status: number
  body: string
  model: string
  constructor(status: number, body: string, model: string) {
    super(`OpenRouter exhausted: ${status}`)
    this.status = status
    this.body = body
    this.model = model
  }
}

async function openRouterChat(
  messages: Message[],
  system: string,
): Promise<{ response: Response; model: (typeof FREE_MODELS)[number] }> {
  const payload = {
    messages: [
      { role: 'system', content: system },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    tools: [
      {
        type: 'openrouter:web_search',
        parameters: {
          max_results: 3,
          max_uses: 2,
          search_context_size: 'low',
        },
      },
    ],
    max_tokens: 1000,
    temperature: 0.9,
  }

  let lastStatus = 502
  let lastBody = ''
  let lastModel: (typeof FREE_MODELS)[number] = FREE_MODELS[0]

  for (const model of FREE_MODELS) {
    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
      lastModel = model
      const isLastAttempt = attempt === ATTEMPTS_PER_MODEL - 1
      console.log(`[openrouter] → POST chat/completions model=${model} attempt=${attempt + 1}/${ATTEMPTS_PER_MODEL}`)
      const t0 = Date.now()
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'Monika Chat',
          },
          body: JSON.stringify({ ...payload, model }),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })
        const ms = Date.now() - t0
        if (response.ok) {
          console.log(`[openrouter] ← ${response.status} ok model=${model} ${ms}ms`)
          return { response, model }
        }
        const errBody = await response.text().catch(() => '')
        lastStatus = response.status
        lastBody = errBody
        console.warn(`[openrouter] ← ${response.status} fail model=${model} ${ms}ms ${clip(errBody, 200)}`)

        const retryable = response.status === 429 || response.status >= 500
        if (retryable && !isLastAttempt) {
          console.log(`[openrouter] retrying after ${400 * (attempt + 1)}ms`)
          await sleep(400 * (attempt + 1))
          continue
        }
        console.log(`[openrouter] giving up on ${model}`)
        break
      } catch (e) {
        lastStatus = 504
        lastBody = e instanceof Error ? e.message : String(e)
        console.error(`[openrouter] error model=${model} attempt=${attempt + 1}:`, lastBody)
        if (!isLastAttempt) {
          await sleep(400 * (attempt + 1))
          continue
        }
        break
      }
    }
  }

  console.error(`[openrouter] all models exhausted  last=${lastModel} status=${lastStatus}`)
  throw new UpstreamExhaustedError(lastStatus, lastBody, lastModel)
}

app.post('/api/chat', async (req, res) => {
  const t0 = Date.now()
  const { messages } = req.body as {
    messages: Message[]
  }
  const lastUser = [...(messages ?? [])].reverse().find(m => m.role === 'user')
  console.log(`[chat] request received  messages=${messages?.length ?? 0}  lastUser="${clip(lastUser?.content ?? '')}"`)

  if (!OPENROUTER_API_KEY) {
    console.error('[chat] OPENROUTER_API_KEY not set — aborting')
    res.status(500).json({ error: 'OPENROUTER_API_KEY not set' })
    return
  }

  try {
    const memory = await loadMemory()
    console.log(`[chat] memory loaded  name=${memory.name ?? '(none)'}  facts=${memory.facts?.length ?? 0}`)
    const system = [
      MONIKA_SYSTEM_PROMPT,
      '',
      formatMemoryBlock(memory),
      '',
      MEMORY_PROTOCOL,
    ].join('\n')

    console.log('[chat] calling OpenRouter…')
    const { response, model } = await openRouterChat(messages, system)

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    }
    const raw = data.choices[0]?.message?.content ?? "I... don't know what to say."
    const usage = data.usage
    if (usage) {
      console.log(`[chat] usage  prompt=${usage.prompt_tokens ?? '?'}  completion=${usage.completion_tokens ?? '?'}  total=${usage.total_tokens ?? '?'}`)
    }
    const { clean, name, facts } = extractMemoryUpdates(raw)
    if (name || facts.length) {
      await saveMemory(mergeMemory(memory, name, facts))
      console.log(`[chat] memory updated  name=${name ?? '(unchanged)'}  +facts=${facts.length}`)
    }
    console.log(`[chat] reply ready  model=${model}  ${Date.now() - t0}ms  "${clip(clean)}"`)
    res.json({ type: 'reply', content: clean })
    console.log(`[chat] response sent  ${Date.now() - t0}ms`)
  } catch (e) {
    if (e instanceof UpstreamExhaustedError) {
      const status = e.status === 429 ? 429 : e.status === 504 ? 504 : 502
      console.error(`[chat] upstream exhausted  ${status} model=${e.model} ${Date.now() - t0}ms ${clip(e.body, 200)}`)
      res.status(status).json({
        error: status === 429 ? 'Rate limited' : status === 504 ? 'Upstream timeout' : 'Upstream error',
      })
      console.log(`[chat] error response sent  ${status}  ${Date.now() - t0}ms`)
      return
    }
    console.error(`[chat] failed  ${Date.now() - t0}ms:`, e)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(PORT, () => {
  console.log(`Monika is listening on http://localhost:${PORT} ♥`)
})
