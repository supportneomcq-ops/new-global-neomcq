'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, CheckCircle2, Bot, User, HelpCircle, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  servedFromFaq?: boolean;
  creditsDeducted?: number;
  createdAt?: string;
}

interface TutorChatPanelProps {
  lessonId: string;
  topicId: string;
  userId?: string;
  topicName?: string;
}

export function TutorChatPanel({
  lessonId,
  topicId,
  userId = 'system-user',
  topicName = 'Canonical Topic',
}: TutorChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string }>>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load chat history & FAQs on mount or lesson change
  useEffect(() => {
    let isMounted = true;

    async function loadHistoryAndFaqs() {
      setIsFetchingHistory(true);
      try {
        // Fetch chat messages history for this lesson
        const chatRes = await fetch(`/api/ai-tutor/chat?lessonId=${lessonId}&userId=${userId}`);
        const chatData = await chatRes.json();

        if (isMounted && chatData.success && Array.isArray(chatData.messages)) {
          setMessages(
            chatData.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              servedFromFaq: m.servedFromFaq,
              creditsDeducted: m.creditsDeducted,
              createdAt: m.createdAt,
            }))
          );
        }

        // Fetch top FAQs for this topic ($0 credit)
        const faqRes = await fetch(`/api/ai-tutor/faqs?topicId=${topicId}`);
        const faqData = await faqRes.json();

        if (isMounted && faqData.success && Array.isArray(faqData.faqs)) {
          setFaqs(faqData.faqs);
        }
      } catch (err) {
        console.warn('Failed to load chat history/FAQs:', err);
      } finally {
        if (isMounted) setIsFetchingHistory(false);
      }
    }

    loadHistoryAndFaqs();

    return () => {
      isMounted = false;
    };
  }, [lessonId, topicId, userId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Submit Question to /api/ai-tutor/chat
  const handleSubmitQuestion = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;

    const cleanPrompt = questionText.trim();
    setInputText('');
    setIsLoading(true);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: cleanPrompt,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/ai-tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          topicId,
          userId,
          question: cleanPrompt,
        }),
      });

      const data = await res.json();

      if (data.success && data.assistantMessage) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          {
            id: data.userMessage?.id || tempUserMsg.id,
            role: 'user',
            content: cleanPrompt,
          },
          {
            id: data.assistantMessage.id,
            role: 'assistant',
            content: data.assistantMessage.content,
            servedFromFaq: data.servedFromFaq,
            creditsDeducted: data.creditsDeducted || 0,
            createdAt: data.assistantMessage.createdAt,
          },
        ]);
      } else {
        // Error response fallback
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `I'm sorry, I couldn't process your question: ${data.error || 'Server error'}. Please try again.`,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Network error: ${err.message}. Please check your connection.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] max-h-[640px] rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <span>AI Doubt Mentor</span>
            </h4>
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Grounded in Canonical Notes
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          $0 FAQ Reuse
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
        {isFetchingHistory ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2 text-slate-400 py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-xs">Loading tutor chat history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 px-4 space-y-3 bg-slate-50 rounded-2xl border border-slate-100">
            <HelpCircle className="w-8 h-8 text-indigo-500 mx-auto" />
            <div className="space-y-1">
              <p className="font-bold text-slate-800 text-xs">Have a question about {topicName}?</p>
              <p className="text-[11px] text-slate-500">
                Ask any conceptual doubt, request visual analogies, or query board traps.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3.5 rounded-2xl space-y-1 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white ml-6 rounded-tr-none font-medium'
                  : 'bg-slate-100 text-slate-800 mr-6 rounded-tl-none border border-slate-200 leading-relaxed'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] opacity-75 font-semibold">
                <span className="flex items-center gap-1">
                  {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3 text-indigo-600" />}
                  {msg.role === 'user' ? 'You' : 'AI Tutor'}
                </span>
                {msg.role === 'assistant' && (
                  <span>
                    {msg.servedFromFaq ? 'FAQ Answer ($0)' : 'AI Personalized'}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))
        )}

        {isLoading && (
          <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-600 text-xs flex items-center gap-2 w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Formulating answer grounded in canonical notes...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick FAQ Pills ($0 credits) */}
      {faqs.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Suggested Topic FAQs ($0 Credits):
          </p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            {faqs.slice(0, 3).map((faq) => (
              <button
                key={faq.id}
                type="button"
                onClick={() => handleSubmitQuestion(faq.question)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-indigo-600 font-semibold whitespace-nowrap transition-colors cursor-pointer border border-slate-200 shrink-0"
              >
                💡 {faq.question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmitQuestion(inputText);
        }}
        className="flex gap-2 pt-2 border-t border-slate-200"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a doubt about this lesson..."
          disabled={isLoading}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:border-indigo-600 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
