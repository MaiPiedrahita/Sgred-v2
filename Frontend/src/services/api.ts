const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'
let apiToken: string | null = null

export class ApiError extends Error {
  constructor(
    message: string,
    readonly codigo?: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function setApiToken(token: string | null) {
  apiToken = token
}

export async function apiRequest<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      ...opciones.headers,
    },
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const error = body?.error
    if (response.status === 401 && error?.codigo === 'SESION_EXPIRADA') {
      setApiToken(null)
      window.dispatchEvent(new CustomEvent('sgred-session-expired', { detail: error?.mensaje }))
    }
    throw new ApiError(error?.mensaje || 'Ocurrió un error', error?.codigo, response.status)
  }

  return body.data as T
}
