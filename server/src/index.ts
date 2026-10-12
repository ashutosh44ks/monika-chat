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

async function openRouterChat(messages: Message[], system: string): Promise<Response> {
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

  let lastResponse: Response | undefined
  let lastErr: unknown
  for (const model of FREE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
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
        })
        if (response.ok) return response
        lastResponse = response
        if (response.status === 429 || response.status >= 500) {
          await sleep(400 * (attempt + 1))
          continue
        }
        break // hard 4xx on this model → try next
      } catch (e) {
        lastErr = e
        await sleep(400 * (attempt + 1))
      }
    }
  }
  if (lastResponse) return lastResponse
  throw lastErr
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body as { messages: Message[] }

  if (!OPENROUTER_API_KEY) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY not set' })
    return
  }

  try {
    const memory = await loadMemory()
    const system = [
      MONIKA_SYSTEM_PROMPT,
      '',
      formatMemoryBlock(memory),
      '',
      MEMORY_PROTOCOL,
    ].join('\n')

    const response = await openRouterChat(messages, system)

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenRouter error:', err)
      res.status(502).json({ error: 'Upstream error' })
      return
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }
    const raw = data.choices[0]?.message?.content ?? "I... don't know what to say."
    const { clean, name, facts } = extractMemoryUpdates(raw)
    if (name || facts.length) {
      await saveMemory(mergeMemory(memory, name, facts))
    }
    res.json({ type: 'reply', content: clean })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(PORT, () => {
  console.log(`Monika is listening on http://localhost:${PORT} ♥`)
})
