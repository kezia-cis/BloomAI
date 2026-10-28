/**
 * BloomAI API Service
 * Handles prediction requests and backend health checks.
 */

export interface PredictionItem {
  label: string
  confidence: number
}

export interface PredictionResponse {
  predicted_class: string
  confidence: number
  top_predictions: PredictionItem[]
}

export interface HealthResponse {
  status: string
  model_loaded: boolean
  classes_count: number
  architecture: string
  dataset: string
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')

/**
 * Predicts the flower species by uploading the image to the FastAPI backend.
 * Uses real model inference; throws descriptive errors when unavailable.
 */
export async function predictFlower(file: File): Promise<PredictionResponse> {
  const formData = new FormData()
  formData.append('file', file)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      body: formData,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Cannot connect to BloomAI backend at ${API_BASE_URL}. Ensure the FastAPI server is running with 'uvicorn main:app --reload' on port 8000. (${errorMsg})`
    )
  }

  if (!response.ok) {
    let errorDetail = `Backend returned status ${response.status} (${response.statusText})`
    try {
      const data = await response.json()
      if (data && data.detail) {
        errorDetail = data.detail
      }
    } catch {
      // Use standard error detail
    }
    throw new Error(errorDetail)
  }

  const data: PredictionResponse = await response.json()
  return data
}

/**
 * Checks backend health and whether the machine learning model is loaded.
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    throw new Error(`Backend unavailable at ${API_BASE_URL}: ${errorMsg}`)
  }

  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`)
  }

  const data: HealthResponse = await response.json()
  return data
}
