'use client';

import React, { useState } from 'react';
import { FiSend, FiCpu } from 'react-icons/fi';
import { SignInButton } from '@/components/sign-in';
import { useSession } from 'next-auth/react';

export default function ChatbotPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [thinking, setThinking] = useState(false);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage = {
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');
    setThinking(true);

    const accessToken = session?.accessToken;

    if (!accessToken) {
      showBotResponse('No se pudo obtener el token de acceso. Por favor, inicia sesión nuevamente.');
      setThinking(false);
      return;
    }

    switch (inputMessage.toLowerCase()) {
      case 'drive':
        await fetchDriveFiles(accessToken);
        break;
      case 'tasks':
        await fetchTasks(accessToken);
        break;
      case 'calendar':
        await fetchCalendarEvents(accessToken);
        break;
      case 'youtube':
        await fetchYouTubePlaylists(accessToken);
        break;
      case 'email':
        await fetchEmails(accessToken);
        break;
      default:
        showBotResponse('Comando no reconocido. Comandos disponibles: drive, tasks, calendar, youtube, email');
    }

    setThinking(false);
  };

  const fetchEmails = async (token) => {
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al obtener emails');

      const data = await response.json();
      const emails = await Promise.all(
        data.messages.map(async (message) => {
          const messageResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          return messageResponse.json();
        })
      );

      showBotResponse('Últimos correos', null, {
        type: 'email',
        data: emails
      });
    } catch (error) {
      console.error(error);
      showBotResponse('Error al obtener emails.');
    }
  };

  const fetchDriveFiles = async (token) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?' +
        new URLSearchParams({
          pageSize: '10',
          fields: 'files(id,name,mimeType,webViewLink,thumbnailLink,modifiedTime,size)',
          orderBy: 'modifiedTime desc'
        }), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al obtener archivos de Drive');

      const data = await response.json();
      showBotResponse('Archivos de Drive', null, {
        type: 'drive',
        data: data.files
      });
    } catch (error) {
      console.error(error);
      showBotResponse('Error al obtener archivos de Drive.');
    }
  };

  const fetchTasks = async (token) => {
    try {
      // Primero obtener las listas de tareas
      const listsResponse = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!listsResponse.ok) throw new Error('Error al obtener listas de tareas');

      const listsData = await listsResponse.json();
      
      // Obtener tareas de cada lista
      const allTasks = await Promise.all(
        listsData.items.map(async (list) => {
          const tasksResponse = await fetch(
            `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const tasksData = await tasksResponse.json();
          return (tasksData.items || []).map(task => ({
            ...task,
            listId: list.id,
            listTitle: list.title
          }));
        })
      );

      showBotResponse('Tareas', null, {
        type: 'tasks',
        data: {
          tasks: allTasks.flat(),
          lists: listsData.items
        }
      });
    } catch (error) {
      console.error(error);
      showBotResponse('Error al obtener tareas.');
    }
  };

  const fetchCalendarEvents = async (token) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?' +
        new URLSearchParams({
          timeMin: new Date().toISOString(),
          maxResults: '10',
          singleEvents: 'true',
          orderBy: 'startTime',
          fields: 'items(id,summary,location,description,start,end,colorId)'
        }), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al obtener eventos de calendario');

      const data = await response.json();
      showBotResponse('Eventos de Calendario', null, {
        type: 'calendar',
        data: data.items
      });
    } catch (error) {
      console.error(error);
      showBotResponse('Error al obtener eventos de calendario.');
    }
  };

  const fetchYouTubePlaylists = async (token) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/youtube/v3/playlists?' +
        new URLSearchParams({
          part: 'snippet,contentDetails',
          mine: 'true',
          maxResults: '10'
        }), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al obtener playlists de YouTube');

      const data = await response.json();
      showBotResponse('Playlists de YouTube', null, {
        type: 'youtube',
        data: data.items
      });
    } catch (error) {
      console.error(error);
      showBotResponse('Error al obtener playlists de YouTube.');
    }
  };

  const showBotResponse = (title, content = '', customData = null) => {
    const botResponse = {
      text: `${title} ${content}`,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString(),
      customData
    };
    setMessages(prev => [...prev, botResponse]);
  };

  const renderCustomContent = (customData) => {
    switch (customData.type) {
      case 'email':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-3">Últimos Correos</h3>
            {customData.data.map((email, index) => {
              const headers = {};
              email.payload.headers.forEach(header => {
                headers[header.name.toLowerCase()] = header.value;
              });
              
              return (
                <div key={index} className="bg-secondary/10 p-4 rounded-lg border border-secondary/20">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{headers.from}</h4>
                      <p className="text-lg font-semibold">{headers.subject}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(parseInt(email.internalDate)).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-3">
                    {email.snippet}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'calendar':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-3">Próximos Eventos</h3>
            {customData.data.map((event, index) => {
              const startDate = new Date(event.start?.dateTime || event.start?.date);
              const endDate = new Date(event.end?.dateTime || event.end?.date);
              
              return (
                <div key={index} className="bg-secondary/10 p-4 rounded-lg border border-secondary/20">
                  <div className="flex gap-4">
                    <div className="bg-primary/10 p-2 rounded-md text-center min-w-[80px]">
                      <div className="text-sm font-bold">
                        {startDate.toLocaleDateString('es-ES', { month: 'short' })}
                      </div>
                      <div className="text-2xl font-bold">{startDate.getDate()}</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{event.summary}</h4>
                      <p className="text-sm text-muted-foreground">
                        {startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - 
                        {endDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {event.location && (
                        <p className="text-sm mt-1">📍 {event.location}</p>
                      )}
                      {event.description && (
                        <p className="text-sm mt-2 line-clamp-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-3">Mis Tareas</h3>
            {customData.data.tasks.map((task, index) => (
              <div key={index} className="bg-secondary/10 p-4 rounded-lg border border-secondary/20">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    className="mt-1 rounded-full"
                    readOnly
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.due && (
                      <p className="text-sm text-muted-foreground">
                        Vence: {new Date(task.due).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Lista: {task.listTitle}
                    </p>
                    {task.notes && (
                      <p className="mt-2 text-sm">{task.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'drive':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-3">Archivos de Drive</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customData.data.map((file, index) => (
                <a
                  key={index}
                  href={file.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-secondary/10 p-4 rounded-lg border border-secondary/20 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {file.mimeType.includes('image') ? '🖼️' :
                       file.mimeType.includes('pdf') ? '📄' :
                       file.mimeType.includes('document') ? '📝' :
                       file.mimeType.includes('spreadsheet') ? '📊' :
                       file.mimeType.includes('presentation') ? '📽️' : '📁'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{file.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Modificado: {new Date(file.modifiedTime).toLocaleString()}
                      </p>
                      {file.size && (
                        <p className="text-xs text-muted-foreground">
                          Tamaño: {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>
                  {file.thumbnailLink && (
                    <div className="mt-2 aspect-video rounded-md overflow-hidden">
                      <img
                        src={file.thumbnailLink}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        );

      case 'youtube':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-3">Playlists de YouTube</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customData.data.map((playlist, index) => (
                <a
                  key={index}
                  href={`https://www.youtube.com/playlist?list=${playlist.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-secondary/10 rounded-lg overflow-hidden border border-secondary/20 hover:bg-secondary/20 transition-colors"
                >
                  <div className="aspect-video relative">
                    <img
                      src={playlist.snippet.thumbnails.medium.url}
                      alt={playlist.snippet.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <h4 className="font-medium text-white">
                        {playlist.snippet.title}
                      </h4>
                      <p className="text-sm text-white/80">
                        {playlist.contentDetails?.itemCount || 0} videos
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {playlist.snippet.description}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        );

      default:
        return <p>{customData.text}</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b">
        <SignInButton className="flex items-center gap-2 px-4 py-2 rounded-md border" />
      </header>

      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-4 ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.customData ? (
                  renderCustomContent(message.customData)
                ) : (
                  <p>{message.text}</p>
                )}
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
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Escribe un comando (drive, tasks, calendar, youtube, email)..."
            className="flex-1 p-2 rounded-md border focus:outline-none focus:ring-2 bg-black"
          />
          <button
            type="submit"
            className="p-2 rounded-md border"
          >
            <FiSend />
          </button>
        </div>
      </form>
    </div>
  );
}