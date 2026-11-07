import { describe, it, expect } from 'vitest'
import { isRelevant, median, rankMatches } from '@/lib/suppliers/trend-match'

const p = (id: string, name: string, price: number, inStock = true) => ({ id, name, price, url: `https://x/${id}`, inStock })

describe('isRelevant', () => {
  it('needs at least half of the keyword words', () => {
    expect(isRelevant('solar garden lantern', 'Solar Lantern LED')).toBe(true)
    expect(isRelevant('solar garden lantern', 'Garden hose 10m')).toBe(false)
  })
  it('rejects an empty keyword', () => {
    expect(isRelevant('', 'anything')).toBe(false)
  })
})

describe('median', () => {
  it('handles odd, even and empty lists', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(median([])).toBeNull()
  })
})

describe('rankMatches', () => {
  it('drops irrelevant, zero-price and ranks in-stock cheapest first', () => {
    const r = rankMatches('massage gun', {
      takealot: [p('a', 'Massage Gun Pro', 400), p('b', 'Phone case', 50), p('c', 'Massage Gun Mini', 0)],
      makro: [p('d', 'Massage Gun Deep Tissue', 300), p('e', 'Massage Gun Out Of Stock', 100, false)],
    })
    expect(r.matches.map(m => m.id)).toEqual(['makro-d', 'takealot-a', 'makro-e'])
    expect(r.marketPrice).toBe(350)
    expect(r.matches[0].marginAtMarket).toBeGreaterThan(r.matches[1].marginAtMarket)
  })

  it('returns no margin and no market price when nothing matches', () => {
    const r = rankMatches('massage gun', { takealot: [p('a', 'Phone case', 50)] })
    expect(r.matches).toEqual([])
    expect(r.marketPrice).toBeNull()
  })

  it('respects the limit', () => {
    const list = Array.from({ length: 30 }, (_, i) => p(String(i), 'Massage Gun', 100 + i))
    expect(rankMatches('massage gun', { takealot: list }, 5).matches).toHaveLength(5)
  })
})
