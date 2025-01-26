export const geminiProvider = {
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
  headers: {
    'Content-Type': 'application/json'
  },
  defaultBody: {
    model: 'gemini-1.5-flash',
    temperature: 1,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192
  },
  chat: async (messages: any[], config?: Record<string, any>) => {
    const model = config?.model || geminiProvider.defaultBody.model;
    const url = `${geminiProvider.baseUrl}/${model}:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`;
    
    // Transformar los mensajes al formato que espera Gemini
    const contents = messages.map(msg => {
      if (msg.role === 'system') {
        // Para mensajes del sistema, los agregamos como contexto en el primer mensaje del usuario
        return null;
      }
      return {
        role: msg.role,
        parts: [{ text: msg.content }]
      };
    }).filter(Boolean);

    // Si hay un mensaje del sistema, agregarlo al primer mensaje del usuario
    const systemMessage = messages.find(msg => msg.role === 'system');
    if (systemMessage && contents.length > 0) {
      contents[0].parts[0].text = `${systemMessage.content}\n\nUser: ${contents[0].parts[0].text}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: geminiProvider.headers,
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: config?.temperature || geminiProvider.defaultBody.temperature,
          topK: config?.topK || geminiProvider.defaultBody.topK,
          topP: config?.topP || geminiProvider.defaultBody.topP,
          maxOutputTokens: config?.maxOutputTokens || geminiProvider.defaultBody.maxOutputTokens
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error en la respuesta de Gemini API: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Respuesta inesperada de Gemini API');
    }
    
    return data.candidates[0].content.parts[0].text;
  }
};