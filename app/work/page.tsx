'use client';

import React, { useState } from 'react';
import { FiSend, FiCpu, FiRefreshCw } from 'react-icons/fi';
import { SignInButton } from '@/components/sign-in';
import { useSession } from 'next-auth/react';
import { freeProvider, groqProvider, geminiProvider } from '@/lib/ai/providers';

const PROVIDERS = {
  free: {
    name: 'Free AI',
    provider: freeProvider,
    models: freeProvider.models
  },
  groq: {
    name: 'Groq',
    provider: groqProvider,
    models: {
      'mixtral-8x7b-32768': { name: 'Mixtral 8x7B', capabilities: ['Text Generation'] },
      'llama2-70b-4096': { name: 'LLaMA 2 70B', capabilities: ['Text Generation'] }
    }
  },
  gemini: {
    name: 'Gemini',
    provider: geminiProvider,
    models: {
      'gemini-1.5-pro': { name: 'Gemini 1.5 Pro', capabilities: ['Text Generation'] },
      'gemini-1.5-flash': { name: 'Gemini 1.5 Flash', capabilities: ['Text Generation'] },
      'gemini-1.5-fast': { name: 'Gemini 1.5 Fast', capabilities: ['Text Generation'] },
      'gemini-1.0-pro': { name: 'Gemini 1.0 Pro', capabilities: ['Text Generation'] },
      'gemini-1.0-ultra': { name: 'Gemini 1.0 Ultra', capabilities: ['Text Generation'] }
    }
  }
};

export default function ChatbotPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [thinking, setThinking] = useState(false);
  const [currentProvider, setCurrentProvider] = useState('free');
  const [currentModel, setCurrentModel] = useState("5");
  const [modelStatus, setModelStatus] = useState({});
  const [modelResponses, setModelResponses] = useState({});
  const [selectedModelInfo, setSelectedModelInfo] = useState(null);
  const [isTestingModels, setIsTestingModels] = useState(false);

  const testModel = async (provider, modelId, modelName) => {
    try {
      const response = await fetch(`/api/ai/providers/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          data: {
            model: modelName,
            messages: [{ role: 'user', content: 'test' }]
          }
        })
      });

      const data = await response.json();
      setModelStatus(prev => ({
        ...prev,
        [`${provider}-${modelId}`]: response.ok
      }));
      setModelResponses(prev => ({
        ...prev,
        [`${provider}-${modelId}`]: {
          status: response.status,
          data: data,
          timestamp: new Date().toLocaleString()
        }
      }));
      return response.ok;
    } catch (error) {
      setModelStatus(prev => ({
        ...prev,
        [`${provider}-${modelId}`]: false
      }));
      setModelResponses(prev => ({
        ...prev,
        [`${provider}-${modelId}`]: {
          status: 'error',
          data: error.message,
          timestamp: new Date().toLocaleString()
        }
      }));
      return false;
    }
  };

  const testAllModels = async () => {
    setIsTestingModels(true);
    setModelStatus({});

    const tests = Object.entries(PROVIDERS).flatMap(([providerKey, provider]) =>
      Object.entries(provider.models).map(([modelId, model]) => ({
        providerKey,
        modelId,
        modelName: model.name
      }))
    );

    // Procesar cada test individualmente para mejor control de errores
    const processTest = async ({ providerKey, modelId, modelName }) => {
      // Marcar como testing
      setModelStatus(prev => ({
        ...prev,
        [`${providerKey}-${modelId}`]: 'testing'
      }));

      try {
        const response = await fetch(`/api/ai/providers/${providerKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'chat',
            data: {
              model: modelName,
              messages: [{ role: 'user', content: 'test' }]
            }
          })
        });

        const data = await response.json();

        // Actualizar estado inmediatamente, incluyendo errores HTTP
        const isSuccess = response.ok && !data.error;
        setModelStatus(prev => ({
          ...prev,
          [`${providerKey}-${modelId}`]: isSuccess
        }));

        setModelResponses(prev => ({
          ...prev,
          [`${providerKey}-${modelId}`]: {
            status: response.status,
            data: data,
            error: !isSuccess,
            timestamp: new Date().toLocaleString()
          }
        }));

      } catch (error) {
        // Actualizar estado inmediatamente en caso de error
        console.error(`Error testing ${modelName}:`, error);
        setModelStatus(prev => ({
          ...prev,
          [`${providerKey}-${modelId}`]: false
        }));

        setModelResponses(prev => ({
          ...prev,
          [`${providerKey}-${modelId}`]: {
            status: 'error',
            data: error.message,
            error: true,
            timestamp: new Date().toLocaleString()
          }
        }));
      }
    };

    // Procesar todos los tests en paralelo
    await Promise.all(tests.map(processTest));
    setIsTestingModels(false);
  };

  const ModelInfoModal = ({ info, onClose }) => {
    if (!info) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-black p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Estado del Modelo</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            <p>Timestamp: {info.timestamp}</p>
            <p>Status: {info.status}</p>
            <div className="mt-4">
              <p className="font-bold mb-2">Respuesta:</p>
              <pre className="bg-gray-900 p-4 rounded overflow-auto">
                {JSON.stringify(info.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage = {
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setThinking(true);

    try {
      let response;
      const provider = PROVIDERS[currentProvider].provider;
      const modelName = PROVIDERS[currentProvider].models[currentModel].name;

      if (currentProvider === 'free') {
        const modelCapabilities = PROVIDERS.free.models[currentModel]?.capabilities || [];

        if (modelCapabilities.includes("Image Generation")) {
          response = await provider.generateImage(inputMessage, { model: currentModel });
          response = `Imagen generada: ${response}`;
        }
        else if (modelCapabilities.includes("Image Vision") &&
          (inputMessage.startsWith('http') || inputMessage.startsWith('https'))) {
          response = await provider.analyzeImage(inputMessage, { model: currentModel });
        }
        else {
          response = await provider.chat([
            { role: "system", content: "Eres un asistente útil y amigable que proporciona respuestas claras y concisas." },
            { role: "user", content: inputMessage }
          ], { model: currentModel });
        }
      } else {
        response = await provider.chat([
          { role: "system", content: "Eres un asistente útil y amigable que proporciona respuestas claras y concisas." },
          { role: "user", content: inputMessage }
        ], { model: modelName });
      }

      setMessages(prev => [...prev, {
        text: response,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        text: error.message || "Lo siento, ha ocurrido un error al procesar tu mensaje.",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <SignInButton className="flex items-center gap-2 px-4 py-2 rounded-md border" />
          <button
            onClick={testAllModels}
            disabled={isTestingModels}
            className="px-4 py-2 rounded-md border flex items-center gap-2"
          >
            <FiRefreshCw className={isTestingModels ? 'animate-spin' : ''} />
            Verificar Modelos
          </button>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex gap-2">
            {Object.entries(PROVIDERS).map(([key, { name }]) => (
              <button
                key={key}
                onClick={() => setCurrentProvider(key)}
                className={`px-4 py-2 rounded-md border ${currentProvider === key ? 'bg-primary text-primary-foreground' : ''
                  }`}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(PROVIDERS[currentProvider].models).map(([id, model]) => (
              <div
                key={id}
                className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${currentModel === id ? 'bg-primary text-primary-foreground' : ''
                  }`}
                onClick={() => setCurrentModel(id)}
              >
                <span>{model.name}</span>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (modelResponses[`${currentProvider}-${id}`]) {
                      setSelectedModelInfo(modelResponses[`${currentProvider}-${id}`]);
                    }
                  }}
                  className={`w-3 h-3 rounded-full cursor-pointer transition-colors duration-200 ${modelStatus[`${currentProvider}-${id}`] === 'testing'
                      ? 'bg-yellow-500 animate-pulse'
                      : modelStatus[`${currentProvider}-${id}`] === undefined
                        ? 'bg-gray-400'
                        : modelStatus[`${currentProvider}-${id}`]
                          ? 'bg-green-500'
                          : 'bg-red-500'
                    }`}
                  title={
                    modelResponses[`${currentProvider}-${id}`]?.error
                      ? 'Error: Click para ver detalles'
                      : modelStatus[`${currentProvider}-${id}`] === 'testing'
                        ? 'Probando...'
                        : modelStatus[`${currentProvider}-${id}`]
                          ? 'Online: Click para ver detalles'
                          : 'Offline: Click para ver detalles'
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-gray-500 mt-2">
          {currentProvider === 'free' && PROVIDERS.free.models[currentModel]?.capabilities.map(cap => (
            <span key={cap} className="mr-2">
              {cap === "Image Generation" && "Escribe una descripción para generar una imagen"}
              {cap === "Image Vision" && "Pega una URL de imagen para analizarla"}
              {cap === "Text Generation" && "Escribe un mensaje para chatear"}
            </span>
          ))}
        </div>
      </header>

      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                  }`}
              >
                <p className="whitespace-pre-wrap">
                  {message.text.startsWith('Imagen generada: ') ? (
                    <>
                      Imagen generada: {' '}
                      <a
                        href={message.text.replace('Imagen generada: ', '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        Ver Imagen
                      </a>
                    </>
                  ) : message.text}
                </p>
                <span className="text-xs opacity-70 mt-2 block">
                  {message.timestamp}
                </span>
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FiCpu className="animate-spin" />
              <span>El bot está pensando...</span>
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSendMessage}
        className="border-t p-4"
      >
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              currentProvider === 'free' && PROVIDERS.free.models[currentModel]?.capabilities.includes("Image Generation")
                ? "Describe la imagen que quieres generar..."
                : currentProvider === 'free' && PROVIDERS.free.models[currentModel]?.capabilities.includes("Image Vision")
                  ? "Pega la URL de una imagen para analizarla..."
                  : "Escribe un mensaje..."
            }
            className="flex-1 p-2 rounded-md border focus:outline-none focus:ring-2 bg-black"
          />
          <button
            type="submit"
            className="p-2 rounded-md border"
            disabled={thinking}
          >
            <FiSend />
          </button>
        </div>
      </form>

      <ModelInfoModal
        info={selectedModelInfo}
        onClose={() => setSelectedModelInfo(null)}
      />
    </div>
  );
}