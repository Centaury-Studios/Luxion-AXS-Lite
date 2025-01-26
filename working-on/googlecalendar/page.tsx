'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FiSend, FiCpu, FiRepeat, FiClock, FiMapPin } from 'react-icons/fi';
import { SignInButton } from '@/components/sign-in';
import { useSession } from 'next-auth/react';
import { RRule } from 'rrule';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const log = {
  info: (message) => console.log('%c Info ', 'background: #00cc99; color: white;', message),
  error: (message) => console.log('%c Error ', 'background: #ff0033; color: white;', message)
};

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const CalendarEvent = ({ event, style, onClick }) => {
  const hasDetails = event.isRecurring || event.description;
  
  return (
    <div
      className="absolute inset-x-1 bg-primary/10 rounded p-1 text-xs truncate 
                hover:z-10 hover:min-h-fit hover:whitespace-normal cursor-pointer
                hover:bg-primary/20 transition-colors flex items-center gap-2"
      style={style}
      onClick={onClick}
    >
      {hasDetails && <FiRepeat className="flex-shrink-0" />}
      <span className="truncate">{event.summary}</span>
    </div>
  );
};

const EventTimeDisplay = ({ startDate, endDate }) => (
  <div className="flex items-start gap-2">
    <FiClock className="mt-1 flex-shrink-0" />
    <div>
      <div>{startDate.toLocaleDateString()} {startDate.toLocaleTimeString()}</div>
      <div>{endDate.toLocaleDateString()} {endDate.toLocaleTimeString()}</div>
    </div>
  </div>
);

const EventDialog = ({ event, open, onOpenChange }) => {
  if (!event) return null;

  const startDate = new Date(event.start?.dateTime || event.start?.date);
  const endDate = new Date(event.end?.dateTime || event.end?.date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(event.isRecurring || event.description) && <FiRepeat className="inline" />}
            {event.summary}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <EventTimeDisplay startDate={startDate} endDate={endDate} />
          
          {event.location && (
            <div className="flex items-start gap-2">
              <FiMapPin className="mt-1 flex-shrink-0" />
              <div>{event.location}</div>
            </div>
          )}
          
          {event.description && (
            <div className="whitespace-pre-wrap mt-2">
              {event.description}
            </div>
          )}

          {event.recurrence && (
            <div className="text-sm text-muted-foreground">
              Evento recurrente: {event.recurrence[0].replace('RRULE:', '')}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function ChatbotPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [thinking, setThinking] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [eventsCache, setEventsCache] = useState(new Map());

  const generateTimeSlots = useCallback(() => {
    const slots = [];
    for (let hour = 4; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour !== 22) slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const getWeekDates = useCallback((offset) => {
    const start = new Date();
    start.setDate(start.getDate() + offset * 7 - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }, []);

  const processEvents = useCallback((events, startDate, endDate) => {
    return events.map(event => ({
      ...event,
      hasDetails: Boolean(event.recurrence || event.description),
      isRecurring: Boolean(event.recurrence),
      instances: expandRecurringEvent(event, startDate, endDate)
    }));
  }, []);

  const expandRecurringEvent = useCallback((event, startDate, endDate) => {
    if (!event.recurrence) return [event];

    const rruleString = event.recurrence[0].replace('RRULE:', '');
    log.info(`Processing recurring event: ${event.summary} with pattern ${rruleString}`);

    try {
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const rule = RRule.fromString(rruleString);
      rule.options.dtstart = eventStart;

      return rule.between(startDate, endDate, true)
        .map(date => ({
          ...event,
          start: { dateTime: date.toISOString() },
          end: { 
            dateTime: new Date(date.getTime() + 
              (new Date(event.end.dateTime) - new Date(event.start.dateTime))
            ).toISOString() 
          },
          isRecurrenceInstance: true
        }));
    } catch (error) {
      log.error('Error processing recurring event:', error);
      return [event];
    }
  }, []);

  const fetchCalendarEvents = useCallback(async (token, weekOffset) => {
    const cacheKey = `week-${weekOffset}`;
    if (eventsCache.has(cacheKey)) {
      log.info('Using cached events');
      return eventsCache.get(cacheKey);
    }

    const { start, end } = getWeekDates(weekOffset);
    log.info(`Fetching events for week ${start.toDateString()} to ${end.toDateString()}`);

    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?' +
        new URLSearchParams({
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          singleEvents: false,
          maxResults: '2500'
        }), {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Error fetching calendar events');

      const data = await response.json();
      const processedEvents = processEvents(data.items, start, end);
      setEventsCache(prev => new Map(prev).set(cacheKey, processedEvents));
      return processedEvents;
    } catch (error) {
      log.error('Failed to fetch events:', error);
      return [];
    }
  }, [getWeekDates, processEvents]);

  const getEventsForCell = useCallback((events, timeSlot, dayIndex, weekStart) => {
    const cellDate = new Date(weekStart);
    cellDate.setDate(cellDate.getDate() + dayIndex);
    const [hours, minutes] = timeSlot.split(':').map(Number);
    cellDate.setHours(hours, minutes, 0, 0);

    return events.filter(event => {
      const eventStart = new Date(event.start?.dateTime || event.start?.date);
      
      if (!event.recurrence) {
        return eventStart.getDay() === dayIndex &&
               eventStart.getHours() === hours &&
               eventStart.getMinutes() === minutes;
      }

      const rruleString = event.recurrence[0];
      const daysInRule = rruleString.match(/BYDAY=(.*?)(;|$)/)[1].split(',');
      
      return daysInRule.includes(['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][dayIndex]) &&
             eventStart.getHours() === hours &&
             eventStart.getMinutes() === minutes;
    });
  }, []);

  const CalendarGrid = ({ events, timeSlots, weekDates }) => (
    <div className="grid grid-cols-8 gap-px bg-secondary/20 rounded-lg overflow-hidden">
      {timeSlots.map((timeSlot) => (
        <React.Fragment key={timeSlot}>
          <div className="bg-background p-2 text-center text-sm">{timeSlot}</div>
          {DAYS_OF_WEEK.map((_, dayIndex) => {
            const cellEvents = getEventsForCell(events, timeSlot, dayIndex, weekDates.start);
            return (
              <div key={dayIndex} className="bg-background p-1 min-h-[3rem] relative group">
                {cellEvents.map((event, eventIndex) => (
                  <CalendarEvent
                    key={`${event.id}-${eventIndex}`}
                    event={event}
                    style={{ top: `${eventIndex * 1.5}rem` }}
                    onClick={() => setSelectedEvent(event)}
                  />
                ))}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );

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

    if (inputMessage.toLowerCase() === 'calendar') {
      const events = await fetchCalendarEvents(session?.accessToken, currentWeekOffset);
      showBotResponse('Calendario Semanal', null, {
        type: 'calendar',
        data: events
      });
    } else {
      showBotResponse('Comando no reconocido. Comando disponible: calendar');
    }

    setThinking(false);
  };

  const showBotResponse = useCallback((title, content = '', customData = null) => {
    const botResponse = {
      text: `${title} ${content}`,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString(),
      customData
    };
    setMessages(prev => [...prev, botResponse]);
  }, []);

  const renderCustomContent = useCallback(({ type, data }) => {
    if (type !== 'calendar') return <p>{data}</p>;

    const timeSlots = generateTimeSlots();
    const weekDates = getWeekDates(currentWeekOffset);

    return (
      <div className="space-y-4 overflow-x-auto">
        <div className="flex justify-between items-center sticky top-0 bg-background z-10 p-2">
          <button 
            onClick={() => setCurrentWeekOffset(prev => prev - 1)}
            className="px-3 py-1 rounded-md border hover:bg-secondary/20"
          >
            ← Semana anterior
          </button>
          <h3 className="font-semibold text-lg">
            {weekDates.start.toLocaleDateString()} - {weekDates.end.toLocaleDateString()}
          </h3>
          <button 
            onClick={() => setCurrentWeekOffset(prev => prev + 1)}
            className="px-3 py-1 rounded-md border hover:bg-secondary/20"
          >
            Semana siguiente →
          </button>
        </div>
        
        <CalendarGrid 
          events={data}
          timeSlots={timeSlots}
          weekDates={weekDates}
        />

        <EventDialog 
          event={selectedEvent}
          open={Boolean(selectedEvent)}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        />
      </div>
    );
  }, [currentWeekOffset, generateTimeSlots, getWeekDates, selectedEvent]);

  useEffect(() => {
    if (session?.accessToken && messages.some(m => m.customData?.type === 'calendar')) {
      fetchCalendarEvents(session.accessToken, currentWeekOffset).then(events => {
        showBotResponse('Calendario Semanal', null, {
          type: 'calendar',
          data: events
        });
      });
    }
  }, [currentWeekOffset, session?.accessToken, fetchCalendarEvents, showBotResponse]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b">
        <SignInButton className="flex items-center gap-2 px-4 py-2 rounded-md border" />
      </header>

      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-[1200px] mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-full rounded-lg p-4 ${
                  message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {message.customData ? renderCustomContent(message.customData) : <p>{message.text}</p>}
                <span className="text-xs opacity-70 mt-2 block">{message.timestamp}</span>
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FiCpu className="animate-spin" />
              <span>Procesando...</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSendMessage} className="border-t p-4">
        <div className="max-w-[1200px] mx-auto flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Escribe 'calendar' para ver tu calendario..."
            className="flex-1 p-2 rounded-md border focus:outline-none focus:ring-2 bg-black"
          />
          <button type="submit" className="p-2 rounded-md border hover:bg-secondary/20">
            <FiSend />
          </button>
        </div>
      </form>
    </div>
  );
}