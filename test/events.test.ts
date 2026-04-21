import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from '../src/events.js'

describe('EventEmitter', () => {
  it('calls registered listener when event is emitted', () => {
    const emitter = new EventEmitter<{ ping: [value: string] }>()
    const listener = vi.fn()
    emitter.on('ping', listener)
    emitter.emit('ping', 'hello')
    expect(listener).toHaveBeenCalledWith('hello')
  })

  it('supports multiple listeners on same event', () => {
    const emitter = new EventEmitter<{ ping: [value: string] }>()
    const a = vi.fn()
    const b = vi.fn()
    emitter.on('ping', a)
    emitter.on('ping', b)
    emitter.emit('ping', 'hello')
    expect(a).toHaveBeenCalledWith('hello')
    expect(b).toHaveBeenCalledWith('hello')
  })

  it('removes listener with off()', () => {
    const emitter = new EventEmitter<{ ping: [value: string] }>()
    const listener = vi.fn()
    emitter.on('ping', listener)
    emitter.off('ping', listener)
    emitter.emit('ping', 'hello')
    expect(listener).not.toHaveBeenCalled()
  })

  it('removeAll clears all listeners', () => {
    const emitter = new EventEmitter<{ ping: []; pong: [] }>()
    const a = vi.fn()
    const b = vi.fn()
    emitter.on('ping', a)
    emitter.on('pong', b)
    emitter.removeAll()
    emitter.emit('ping')
    emitter.emit('pong')
    expect(a).not.toHaveBeenCalled()
    expect(b).not.toHaveBeenCalled()
  })

  it('does not throw when emitting event with no listeners', () => {
    const emitter = new EventEmitter<{ ping: [] }>()
    expect(() => emitter.emit('ping')).not.toThrow()
  })
})
