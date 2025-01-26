export const geminiProvider = {
    chat: async (messages: any[], config?: Record<string, any>) => {
      const response = await fetch('/api/ai/providers/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config?.model || 'gemini-1.5-flash',
          messages,
          temperature: config?.temperature || 0.7,
          max_tokens: config?.max_tokens || 8192,
          ...config
        })
      });
  
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en Gemini API');
      return data.candidates[0].content.parts[0].text;
    }
};