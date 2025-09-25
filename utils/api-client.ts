import { ENV } from '../src/config/env.js';
import { MODEL_CONFIG } from '../src/config/model-config.js';
import fetch from 'node-fetch';

// OpenAI API example wrapper
export async function openAIRequest(prompt: string, model?: string) {
  const selectedModel = model || MODEL_CONFIG.translation.model;
  
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  });
  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content;
}

// Hugging Face API example wrapper
export async function huggingFaceRequest(endpoint: string, payload: any) {
  const res = await fetch(`https://api-inference.huggingface.co/models/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ENV.HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return data;
}

export default { openAIRequest, huggingFaceRequest };
