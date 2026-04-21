import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from '../src/events.js'

describe('EventEmitter', () => {
  it('calls registered listener when event is emitted', () => {
    const emitter = new EventEmitter<{ ping: [value: string] }>()
    const listener = mock.fn()
    emitter.on('ping', listener)
    emitter.emit('ping', 'hello')
    assert.equal(listener.mock.callCount(), 1)
    assert.deepEqual(listener.mock.calls[0].arguments, ['hello'])
  })

  it('supports multiple listeners on same event', () => {
    const emitter = new EventEmitter<{ ping: [value: string] }>()
    const a = mock.fn()
    const b = mock.fn()
    emitter.on('ping', a)
    emitter.on('ping', b)
    emitter.emit('ping', 'hello')
    assert.equal(a.mock.callCount(), 1)
    assert.deepEqual(a.mock.calls[0].arguments, ['hello'])
    assert.equal(b.mock.callCount(), 1)
    assert.deepEqual(b.mock.calls[0].arguments, ['hello'])
  })

  it('removes listener with off()', () => {
    const emitter = new EventEmitter<{ ping: [value: string] }>()
    const listener = mock.fn()
    emitter.on('ping', listener)
    emitter.off('ping', listener)
    emitter.emit('ping', 'hello')
    assert.equal(listener.mock.callCount(), 0)
  })

  it('removeAll clears all listeners', () => {
    const emitter = new EventEmitter<{ ping: []; pong: [] }>()
    const a = mock.fn()
    const b = mock.fn()
    emitter.on('ping', a)
    emitter.on('pong', b)
    emitter.removeAll()
    emitter.emit('ping')
    emitter.emit('pong')
    assert.equal(a.mock.callCount(), 0)
    assert.equal(b.mock.callCount(), 0)
  })

  it('does not throw when emitting event with no listeners', () => {
    const emitter = new EventEmitter<{ ping: [] }>()
    assert.doesNotThrow(() => emitter.emit('ping'))
  })
})
