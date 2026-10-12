import assert from 'node:assert/strict'
import { extractMemoryUpdates, formatMemoryBlock, mergeMemory } from './memory.ts'

const parsed = extractMemoryUpdates(
  'Nice to meet you, Ash.\n\n[[remember: name=Ash]]\n[[remember: likes poetry]]',
)
assert.equal(parsed.clean, 'Nice to meet you, Ash.')
assert.equal(parsed.name, 'Ash')
assert.deepEqual(parsed.facts, ['likes poetry'])

const merged = mergeMemory({ name: null, facts: ['likes tea'], updatedAt: null }, 'Ash', ['likes poetry'])
assert.equal(merged.name, 'Ash')
assert.deepEqual(merged.facts, ['likes tea', 'likes poetry'])

assert.match(formatMemoryBlock(merged), /Name: Ash/)
console.log('memory.check ok')
