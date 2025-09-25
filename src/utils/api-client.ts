// Offline-only stubs to prevent network usage
export async function openAIRequest(prompt: string, model?: string) {
  throw new Error('Online API disabled: openAIRequest is not available in offline mode');
}

export async function huggingFaceRequest(endpoint: string, payload: any) {
  throw new Error('Online API disabled: huggingFaceRequest is not available in offline mode');
}

export default { openAIRequest, huggingFaceRequest };
