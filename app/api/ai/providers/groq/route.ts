export const groqProvider = {
    chat: async (messages: any[], config?: Record<string, any>) => {
      const response = await fetch('/api/ai/providers/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config?.model || 'mixtral-8x7b-32768',
          messages,
          temperature: config?.temperature || 0.7,
          max_tokens: config?.max_tokens || 1024,
          ...config
        })
      });
  
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en Groq API');
      return data.choices[0].message.content;
    }
  };
  