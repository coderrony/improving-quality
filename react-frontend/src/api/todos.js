/** Build absolute or relative API path (exported for unit tests). */
export function buildApiUrl(rawBase, path) {
  const base = rawBase?.replace(/\/$/, '') || ''
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}

function apiUrl(path) {
  return buildApiUrl(import.meta.env.VITE_API_URL, path)
}

async function apiFetch(path, options = {}) {
  try {
    return await fetch(apiUrl(path), options)
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(BACKEND_DOWN_MSG)
    }
    throw e
  }
}

export const BACKEND_DOWN_MSG =
  'Cannot connect to the API. Start the backend on port 4000 (cd backend-postgresql && npm run dev), or from the project folder run npm run dev to start both servers.'

function assertBackendReachable(res) {
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new Error(BACKEND_DOWN_MSG)
  }
}

async function handleJson(res) {
  const text = await res.text()
  if (!text) {
    return res.ok ? {} : { error: res.statusText }
  }
  try {
    return JSON.parse(text)
  } catch {
    return { error: text || res.statusText }
  }
}

function getDataOrThrow(body, fallbackMessage) {
  if (!body || typeof body !== 'object' || !('data' in body)) {
    throw new Error(fallbackMessage)
  }
  return body.data
}

export async function fetchTodos() {
  const res = await apiFetch('/api/todos')
  assertBackendReachable(res)
  const body = await handleJson(res)
  if (!res.ok) {
    throw new Error(body.error || 'Failed to load todos')
  }
  const data = getDataOrThrow(
    body,
    'Unexpected API response from /api/todos. Check Nginx /api proxy and backend service.',
  )
  if (!Array.isArray(data)) {
    throw new Error(
      'Invalid todos payload. Expected an array from backend /api/todos.',
    )
  }
  return data
}

export async function createTodo({ title, completed = false }) {
  const res = await apiFetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, completed }),
  })
  assertBackendReachable(res)
  const body = await handleJson(res)
  if (!res.ok) {
    throw new Error(body.error || 'Failed to create todo')
  }
  return getDataOrThrow(
    body,
    'Unexpected API response from create todo endpoint.',
  )
}

export async function updateTodo(id, patch) {
  const res = await apiFetch(`/api/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  assertBackendReachable(res)
  const body = await handleJson(res)
  if (!res.ok) {
    throw new Error(body.error || 'Failed to update todo')
  }
  return getDataOrThrow(
    body,
    'Unexpected API response from update todo endpoint.',
  )
}

export async function deleteTodo(id) {
  const res = await apiFetch(`/api/todos/${id}`, {
    method: 'DELETE',
  })
  assertBackendReachable(res)
  if (res.status === 204) return
  const body = await handleJson(res)
  if (!res.ok) {
    throw new Error(body.error || 'Failed to delete todo')
  }
}
