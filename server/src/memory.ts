import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export interface PlayerMemory {
  name: string | null
  facts: string[]
  updatedAt: string | null
}

const MAX_FACTS = 24
const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data')
const MEMORY_PATH = path.join(DATA_DIR, 'memory.json')

const empty = (): PlayerMemory => ({ name: null, facts: [], updatedAt: null })

export async function loadMemory(): Promise<PlayerMemory> {
  try {
    const raw = await readFile(MEMORY_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<PlayerMemory>
    return {
      name: typeof parsed.name === 'string' ? parsed.name : null,
      facts: Array.isArray(parsed.facts)
        ? parsed.facts.filter((f): f is string => typeof f === 'string').slice(0, MAX_FACTS)
        : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    }
  } catch {
    return empty()
  }
}

export async function saveMemory(memory: PlayerMemory): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(MEMORY_PATH, JSON.stringify(memory, null, 2) + '\n', 'utf8')
}

/** Injected into the system prompt so Monika can reference the player. */
export function formatMemoryBlock(memory: PlayerMemory): string {
  if (!memory.name && memory.facts.length === 0) {
    return `PLAYER MEMORY
You do not know their name or lasting details yet. If they share something durable (name, job, hobbies, favorites, pets, timezone), remember it with a trailing tag (see MEMORY PROTOCOL).`
  }
  const lines = [
    'PLAYER MEMORY (use naturally — do not recite as a list unless asked)',
    memory.name ? `- Name: ${memory.name}` : '- Name: unknown',
    ...memory.facts.map(f => `- ${f}`),
  ]
  return lines.join('\n')
}

const REMEMBER_RE = /\[\[remember:\s*([^\]]+)\]\]/gi
const NAME_RE = /^name\s*=\s*(.+)$/i

/** Pull [[remember: ...]] tags out of the model reply; returns cleaned dialogue + updates. */
export function extractMemoryUpdates(reply: string): { clean: string; name: string | null; facts: string[] } {
  const facts: string[] = []
  let name: string | null = null
  const clean = reply.replace(REMEMBER_RE, (_, body: string) => {
    const item = body.trim()
    if (!item) return ''
    const m = item.match(NAME_RE)
    if (m) name = m[1].trim().slice(0, 80)
    else facts.push(item.slice(0, 160))
    return ''
  }).replace(/\n{3,}/g, '\n\n').trim()
  return { clean, name, facts }
}

export function mergeMemory(prev: PlayerMemory, name: string | null, facts: string[]): PlayerMemory {
  const nextFacts = [...prev.facts]
  for (const f of facts) {
    const key = f.toLowerCase()
    if (!nextFacts.some(x => x.toLowerCase() === key)) nextFacts.push(f)
  }
  return {
    name: name ?? prev.name,
    facts: nextFacts.slice(-MAX_FACTS),
    updatedAt: name || facts.length ? new Date().toISOString() : prev.updatedAt,
  }
}

export const MEMORY_PROTOCOL = `MEMORY PROTOCOL
When the player shares a durable fact worth keeping across visits (name, preference, life detail), append ONE tag at the very end of your reply on its own line — never speak the tag aloud in dialogue:
[[remember: short fact]]
For their name specifically: [[remember: name=Alex]]
Do not tag fleeting moods or one-off jokes. At most two tags per reply.`
