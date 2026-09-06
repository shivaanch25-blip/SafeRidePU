import React, { useState, useRef, useEffect } from 'react';
import api from '../../config/axios.js';
import { FiMessageSquare, FiX, FiSend, FiTrash2 } from 'react-icons/fi';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome_1',
    sender: 'assistant',
    text: `👋 **Welcome to SafeRide PU 24/7 AI Assistant!**\n\nI am your dedicated campus transit & safety copilot for **Parul University (Waghodia Campus)**.\n\nAsk me anything about:\n- 📍 **Campus gates, hostels & hospital routes**\n- 💰 **Subsidized fares (Railway Station, Bus Stand, Airport)**\n- 🚗 **Booking safe rides & driver verification PIN**\n- 🚨 **Emergency SOS & campus security protocols**`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

const SUGGESTIONS = [
  { label: '💰 Fare to Vadodara Station?', query: 'What is the fare to Vadodara Railway Station?' },
  { label: '🚗 How to book a ride?', query: 'How do I book a safe ride with driver verification?' },
  { label: '🚨 Emergency contacts?', query: 'What are the campus emergency contacts and SOS procedure?' },
  { label: '⏰ Shuttle timings?', query: 'What are the campus shuttle operating hours?' },
  { label: '🏢 Hostel routes?', query: 'Which hostels are covered by campus transit?' },
];

export const AIChatbotModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isTyping) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await api.post('/chatbot/message', {
        message: query,
        history: messages.slice(-6).map((m) => ({
          role: m.sender,
          content: m.text,
        })),
      });

      const replyText = res.data?.data?.reply || 'I am here to help you with your campus transit needs.';

      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const fallbackReply =
        'I am currently operating in safe offline mode. For instant emergency transit help, please call the Parul University Security Desk directly at **+91 2668 260300** or use the **🚨 SOS** button.';

      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages(INITIAL_MESSAGES);
  };

  return (
    <>
      {/* Floating 24/7 Chatbot Launch Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-800 text-white rounded-2xl shadow-xl shadow-brand-600/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
          title="Open 24/7 Transit & Safety AI Assistant"
        >
          <div className="relative">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute -top-1 -right-1 animate-ping"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute -top-1 -right-1"></span>
            <FiMessageSquare className="text-xl" />
          </div>
          <div className="text-left hidden sm:block">
            <span className="block text-xs font-black tracking-tight leading-none">24/7 Transit AI</span>
            <span className="block text-[10px] text-brand-200 font-semibold leading-none mt-1">
              Ask questions anytime
            </span>
          </div>
        </button>
      )}

      {/* Floating Chat Modal Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[95vw] sm:w-[420px] h-[580px] max-h-[90vh] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-brand-700 to-brand-900 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-xl font-bold border border-white/20">
                🤖
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm leading-none">SafeRide AI Assistant</h3>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" title="Online 24/7"></span>
                </div>
                <p className="text-[11px] text-brand-200 leading-none mt-1">
                  Parul University Transit &bull; 24/7 Active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                title="Clear conversation"
                className="p-2 hover:bg-white/10 rounded-xl transition text-brand-200 hover:text-white cursor-pointer"
              >
                <FiTrash2 className="text-sm" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                className="p-2 hover:bg-white/10 rounded-xl transition text-brand-200 hover:text-white cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-gray-50/50 dark:bg-gray-850/50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-brand-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-gray-750 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <div className="whitespace-pre-line">
                    {msg.text.split('\n').map((line, idx) => {
                      // Simple inline markdown parsing for bold text
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      return (
                        <p key={idx} className={idx > 0 ? 'mt-1' : ''}>
                          {parts.map((part, pIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return (
                                <strong key={pIdx} className="font-bold">
                                  {part.slice(2, -2)}
                                </strong>
                              );
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-gray-750 text-gray-500 w-fit border border-gray-100 dark:border-gray-700">
                <span className="text-xs">SafeRide AI is typing</span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce delay-200"></span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto scrollbar-none">
            {SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.query)}
                className="flex-shrink-0 px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-gray-650 transition text-[11px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 cursor-pointer whitespace-nowrap"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/60 rounded-2xl p-1.5 border border-gray-200 dark:border-gray-600 focus-within:ring-2 focus-within:ring-brand-500">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about rides, fares, campus safety..."
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isTyping}
                className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition cursor-pointer shadow-sm"
              >
                <FiSend className="text-xs" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbotModal;
