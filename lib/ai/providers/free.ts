const AVAILABLE_MODELS = {
  // Provider 1
  "1": { name: "provider-1/gemini-1.5-flash-8b-exp-0827", capabilities: ["Text Generation"] },
  "2": { name: "provider-1/gemini-1.5-flash-8b-001", capabilities: ["Text Generation"] },
  "3": { name: "provider-1/gemini-2.0-flash-exp", capabilities: ["Text Generation"] },
  "4": { name: "provider-1/gemini-2.0-flash-thinking-exp-1219", capabilities: ["Text Generation"] },
  "5": { name: "provider-1/gpt-3.5", capabilities: ["Text Generation"] },
  "6": { name: "provider-1/gpt-4", capabilities: ["Text Generation"] },
  "7": { name: "provider-1/gpt-4o-mini", capabilities: ["Text Generation"] },
  "8": { name: "provider-1/gpt-4o", capabilities: ["Text Generation", "Image Vision"] },
  "9": { name: "provider-1/pixtral-124b", capabilities: ["Text Generation"] },

  // Provider 2
  "10": { name: "provider-2/gpt-4", capabilities: ["Text Generation"] },
  "11": { name: "provider-2/gpt-4-turbo", capabilities: ["Text Generation"] },
  "12": { name: "provider-2/gpt-3.5", capabilities: ["Text Generation"] },
  "13": { name: "provider-2/gpt-3.5-turbo", capabilities: ["Text Generation"] },
  "14": { name: "provider-2/llama-3-8b", capabilities: ["Text Generation"] },
  "15": { name: "provider-2/llama-3.1-70b", capabilities: ["Text Generation"] },
  "16": { name: "provider-2/gemma-2-27b", capabilities: ["Text Generation"] },
  "17": { name: "provider-2/mistral-large", capabilities: ["Text Generation"] },

  // Provider 3
  "18": { name: "provider-3/mistral-nemo", capabilities: ["Text Generation"] },
  "19": { name: "provider-3/gpt-4o-mini", capabilities: ["Text Generation"] },
  "20": { name: "provider-3/llama-3.3-70b", capabilities: ["Text Generation"] },
  "21": { name: "provider-3/qwen-2.5-72b", capabilities: ["Text Generation"] },
  "22": { name: "provider-3/qwen-2.5-coder-32b", capabilities: ["Text Generation"] },
  "23": { name: "provider-3/unity", capabilities: ["Text Generation"] },
  "24": { name: "provider-3/evil", capabilities: ["Text Generation"] },
  "25": { name: "provider-3/deepseek-v3", capabilities: ["Text Generation"] },

  // Image Generation Models
  "26": { name: "flux-dev", capabilities: ["Image Generation"] },
  "27": { name: "sdxl-turbo", capabilities: ["Image Generation"] },
  "28": { name: "flux-schnell", capabilities: ["Image Generation"] },

  // Provider 4
  "29": { name: "provider-4/gpt-4o", capabilities: ["Text Generation", "Image Vision"] },
  "30": { name: "provider-4/gpt-4o-mini", capabilities: ["Text Generation"] },
  "31": { name: "provider-4/Phi-3.5-MoE-instruct", capabilities: ["Text Generation"] },
  "32": { name: "provider-4/Phi-3.5-mini-instruct", capabilities: ["Text Generation"] },
  "33": { name: "provider-4/Phi-3-medium-128k-instruct", capabilities: ["Text Generation"] },
  "34": { name: "provider-4/Cohere-command-r-plus-08-2024", capabilities: ["Text Generation"] },
  "35": { name: "provider-4/Llama-3.2-11B-Vision-Instruct", capabilities: ["Text Generation", "Image Vision"] },
  "36": { name: "provider-4/Llama-3.2-90B-Vision-Instruct", capabilities: ["Text Generation", "Image Vision"] },
  "37": { name: "provider-4/Llama-3.3-70B-Instruct", capabilities: ["Text Generation"] },
  "38": { name: "provider-4/Mistral-Large-2411", capabilities: ["Text Generation"] },
  "39": { name: "provider-4/Codestral-2501", capabilities: ["Text Generation"] },
  "40": { name: "provider-4/text-embedding-3-large", capabilities: ["Text Generation"] },
  "41": { name: "provider-4/text-embedding-3-small", capabilities: ["Text Generation"] },

  // Provider 5
  "42": { name: "provider-5/qwen-2.5-72b", capabilities: ["Text Generation"] },
  "43": { name: "provider-5/codellama-34b", capabilities: ["Text Generation"] },
  "44": { name: "provider-5/gemma-2-27b-it", capabilities: ["Text Generation"] },
  "45": { name: "provider-5/phi-3.5-mini", capabilities: ["Text Generation"] },
  "46": { name: "provider-5/qwen-2.5-coder-32b", capabilities: ["Text Generation"] }
} as const;

export const freeProvider = {
  models: AVAILABLE_MODELS,
  
  hasCapability: (modelId: string, capability: string) => {
    return AVAILABLE_MODELS[modelId]?.capabilities.includes(capability) || false;
  },

  chat: async (messages: any[], config?: { model: string } & Record<string, any>) => {
    const modelId = config?.model || "5";
    const modelName = AVAILABLE_MODELS[modelId].name;

    if (!freeProvider.hasCapability(modelId, "Text Generation")) {
      throw new Error("El modelo seleccionado no soporta generación de texto");
    }

    const response = await fetch('/api/ai/providers/free', { // Actualizada la ruta
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'chat',
        data: {
          model: modelName,
          messages,
          temperature: config?.temperature || 0.7,
          max_tokens: config?.max_tokens || 1024
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error en la API');

    // Manejar diferentes formatos de respuesta
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    } else if (typeof data === 'string') {
      return data;
    }
    throw new Error('Formato de respuesta no reconocido');
  },

  generateImage: async (prompt: string, config?: { model: string } & Record<string, any>) => {
    const modelId = config?.model || "26";
    const modelName = AVAILABLE_MODELS[modelId].name;

    if (!freeProvider.hasCapability(modelId, "Image Generation")) {
      throw new Error("El modelo seleccionado no soporta generación de imágenes");
    }

    const response = await fetch('/api/ai/providers/free', { // Actualizada la ruta
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'image_generation',
        data: {
          model: modelName,
          prompt,
          size: config?.size || "1024x1024",
          n: 1
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error en la API');

    // Manejar diferentes formatos de respuesta
    if (data.url) return data.url;
    if (data.data?.[0]?.url) return data.data[0].url;
    throw new Error('URL de imagen no encontrada en la respuesta');
  },

  analyzeImage: async (imageUrl: string, config?: { model: string } & Record<string, any>) => {
    const modelId = config?.model || "8";
    const modelName = AVAILABLE_MODELS[modelId].name;

    if (!freeProvider.hasCapability(modelId, "Image Vision")) {
      throw new Error("El modelo seleccionado no soporta análisis de imágenes");
    }

    const response = await fetch('/api/ai/providers/free', { // Actualizada la ruta
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'chat',
        data: {
          model: modelName,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "What's in this image?" },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            }
          ],
          max_tokens: config?.max_tokens || 300
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error en la API');

    // Manejar diferentes formatos de respuesta
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    throw new Error('Formato de respuesta no reconocido');
  }
};