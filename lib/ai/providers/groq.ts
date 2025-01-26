export const groqProvider = {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: {
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    defaultBody: {
      model: 'mixtral-8x7b-32768',
      temperature: 0.7,
      max_tokens: 1024
    },
    chat: async (messages: any[], config?: Record<string, any>) => {
      const response = await fetch(groqProvider.url, {
        method: 'POST',
        headers: groqProvider.headers,
        body: JSON.stringify({
          ...groqProvider.defaultBody,
          ...config,
          messages
        })
      });
  
      if (!response.ok) {
        throw new Error('Error en la respuesta de Groq API');
      }
  
      const data = await response.json();
      return data.choices[0].message.content;
    }
  };
  
  