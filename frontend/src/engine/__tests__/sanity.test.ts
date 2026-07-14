import { describe, it, expect } from 'vitest'

// Sanity test — ONLY verifies the vitest setup works.
// No game logic is touched here. Real engine tests come later (6.7c-5+).
describe('sanity', () => {
  it('basic arithmetic works', () => {
    expect(1 + 1).toBe(2)
  })
})
