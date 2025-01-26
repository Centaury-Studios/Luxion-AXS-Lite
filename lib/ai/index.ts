// src/lib/ai/index.ts
import { freeProvider } from './providers/free';
import { groqProvider } from './providers/groq';
import { geminiProvider } from './providers/gemini';

export const providers = {
  free: freeProvider,
  groq: groqProvider,
  gemini: geminiProvider
} as const;

export type Provider = keyof typeof providers;

export interface ChatOptions {
  provider: Provider;
  config?: Record<string, any>;
}

// Helper para el chat
export const chatWithAI = async (messages: any[], options: ChatOptions) => {
  const provider = providers[options.provider];
  if (!provider) {
    throw new Error(`Provider ${options.provider} no soportado`);
  }
  return provider.chat(messages, options.config);
};

// Helper para generar imágenes (solo algunos providers lo soportan)
export const generateImage = async (prompt: string, options: ChatOptions) => {
  const provider = providers[options.provider];
  if (!provider || !provider.generateImage) {
    throw new Error(`Provider ${options.provider} no soporta generación de imágenes`);
  }
  return provider.generateImage(prompt, options.config);
};

// Helper para analizar imágenes (solo algunos providers lo soportan)
export const analyzeImage = async (imageUrl: string, options: ChatOptions) => {
  const provider = providers[options.provider];
  if (!provider || !provider.analyzeImage) {
    throw new Error(`Provider ${options.provider} no soporta análisis de imágenes`);
  }
  return provider.analyzeImage(imageUrl, options.config);
};