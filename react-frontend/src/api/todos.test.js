import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BACKEND_DOWN_MSG,
  buildApiUrl,
  createTodo,
  deleteTodo,
  fetchTodos,
  updateTodo,
} from './todos.js'

describe('buildApiUrl', () => {
  it('uses relative path when base is empty', () => {
    expect(buildApiUrl('', '/api/todos')).toBe('/api/todos')
    expect(buildApiUrl(undefined, 'api/todos')).toBe('/api/todos')
  })

  it('strips trailing slash from base and joins path', () => {
    expect(buildApiUrl('http://localhost:4000/', '/api/todos')).toBe(
      'http://localhost:4000/api/todos',
    )
    expect(buildApiUrl('http://localhost:4000', 'api/todos')).toBe(
      'http://localhost:4000/api/todos',
    )
  })
})

describe('todo API client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubEnv('VITE_API_URL', 'http://localhost:4000')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('fetchTodos returns array from wrapped API response', async () => {
    const payload = { data: [{ id: 1, title: 'a', completed: false }] }
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(payload),
    })

    const rows = await fetchTodos()
    expect(rows).toEqual(payload.data)
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/todos',
      expect.anything(),
    )
  })

  it('maps network TypeError to BACKEND_DOWN_MSG', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(fetchTodos()).rejects.toThrow(BACKEND_DOWN_MSG)
  })

  it('createTodo posts JSON body', async () => {
    const todo = { id: 2, title: 'new', completed: false }
    global.fetch.mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ data: todo }),
    })

    const out = await createTodo({ title: 'new' })
    expect(out).toEqual(todo)
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/todos',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'new', completed: false }),
      }),
    )
  })

  it('updateTodo sends PATCH', async () => {
    const todo = { id: 2, title: 'x', completed: true }
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: todo }),
    })

    await updateTodo(2, { completed: true })
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/todos/2',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('deleteTodo resolves on 204', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => '',
    })

    await expect(deleteTodo(9)).resolves.toBeUndefined()
  })
})
