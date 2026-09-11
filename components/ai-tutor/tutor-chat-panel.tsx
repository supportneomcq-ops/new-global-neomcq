'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, CheckCircle2, Bot, User, HelpCircle, Loader2, ThumbsUp, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { trackTutorEvent } from '@/lib/client/tutor-analytics';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  servedFromFaq?: boolean;
  creditsDeducted?: number;
  createdAt?: string;
  answerJson?: any;
}

interface TutorChatPanelProps {
  lessonId: string;
  examId?: string;
  subjectId?: string;
  topicId: string;
  subtopicId?: string | null;
  userId?: string;
  topicName?: string;
}

export function TutorChatPanel({
  lessonId,
  examId,
  subjectId,
  topicId,
  subtopicId,
  userId = 'system-user',
  topicName = 'Canonical Topic',
}: TutorChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string; answerJson?: any; helpfulCount?: number }>>([]);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const [votedFaqs, setVotedFaqs] = useState<Record<string, boolean>>({});
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

        // Fetch top FAQs for this exact scope ($0 credit)
        const params = new URLSearchParams({ topicId });
        if (examId) params.set('examId', examId);
        if (subjectId) params.set('subjectId', subjectId);
        if (subtopicId) params.set('subtopicId', subtopicId);

        const faqRes = await fetch(`/api/ai-tutor/faqs?${params.toString()}`);
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
  }, [lessonId, examId, subjectId, topicId, subtopicId, userId]);

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

    if (userId) {
      trackTutorEvent({
        userId,
        eventType: 'doubt_asked',
        examId: examId || 'exam-default',
        subjectId: subjectId || 'subj-default',
        topicId,
        subtopicId,
        lessonId,
      });
    }

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
        if (userId) {
          if (data.servedFromFaq) {
            trackTutorEvent({
              userId,
              eventType: 'canonical_faq_reused',
              examId: examId || 'exam-default',
              subjectId: subjectId || 'subj-default',
              topicId,
              subtopicId,
              lessonId,
              faqId: data.faqId || data.assistantMessage?.faqId || null,
            });
          } else {
            trackTutorEvent({
              userId,
              eventType: 'new_doubt_answer_generated',
              examId: examId || 'exam-default',
              subjectId: subjectId || 'subj-default',
              topicId,
              subtopicId,
              lessonId,
            });
          }
        }

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

  const handleToggleFaq = (faqId: string) => {
    const isExpanding = expandedFaqId !== faqId;
    setExpandedFaqId(isExpanding ? faqId : null);

    if (isExpanding && userId) {
      trackTutorEvent({
        userId,
        eventType: 'faq_viewed',
        examId: examId || 'exam-default',
        subjectId: subjectId || 'subj-default',
        topicId,
        subtopicId,
        lessonId,
        faqId,
      });
    }
  };

  const handleVoteHelpful = (faqId: string) => {
    if (votedFaqs[faqId]) return;
    setVotedFaqs((prev) => ({ ...prev, [faqId]: true }));
    setFaqs((prev) =>
      prev.map((f) => (f.id === faqId ? { ...f, helpfulCount: (f.helpfulCount || 0) + 1 } : f))
    );
  };

  // Helper to safely render structured JSON answer or string
  const renderMessageContent = (contentStr: string) => {
    try {
      if (contentStr.trim().startsWith('{') && contentStr.trim().endsWith('}')) {
        const parsed = JSON.parse(contentStr);
        if (parsed.directAnswer) {
          return (
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-950 font-medium">
                <span className="font-bold text-indigo-700 block text-[11px] mb-0.5">DIRECT ANSWER:</span>
                {parsed.directAnswer}
              </div>
              {parsed.explanation && (
                <p className="text-slate-700 leading-relaxed">{parsed.explanation}</p>
              )}
              {Array.isArray(parsed.keyPoints) && parsed.keyPoints.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="font-bold text-[11px] text-slate-800">KEY POINTS:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700 pl-1">
                    {parsed.keyPoints.map((kp: string, idx: number) => (
                      <li key={idx}>{kp}</li>
                    ))}
                  </ul>
                </div>
              )}
              {parsed.commonTrap && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
                  <span className="font-bold text-amber-700 mr-1">⚠️ BOARD TRAP:</span>
                  {parsed.commonTrap}
                </div>
              )}
            </div>
          );
        }
      }
    } catch {
      // Fallthrough to standard text rendering
    }
    return <p className="whitespace-pre-wrap leading-relaxed">{contentStr}</p>;
  };

  return (
    <div className="flex flex-col h-full min-h-[520px] max-h-[660px] rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <span>AI Doubt Mentor & FAQs</span>
            </h4>
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Scope Isolated ({topicName})
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          $0 Canonical Reuse
        </span>
      </div>

      {/* Existing Canonical FAQs Section */}
      {faqs.length > 0 && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              Canonical Doubts for {topicName} ({faqs.length})
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Reused globally</span>
          </div>

          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 text-xs">
            {faqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div key={faq.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => handleToggleFaq(faq.id)}
                    className="w-full px-3 py-2 text-left font-medium text-slate-800 hover:text-indigo-600 flex items-center justify-between gap-2 cursor-pointer text-xs"
                  >
                    <span className="line-clamp-1">❓ {faq.question}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 shrink-0 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-700 space-y-2">
                      {renderMessageContent(faq.answer)}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-500">
                        <button
                          type="button"
                          onClick={() => handleVoteHelpful(faq.id)}
                          disabled={votedFaqs[faq.id]}
                          className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer disabled:opacity-50"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          {votedFaqs[faq.id] ? 'Helpful!' : 'Was this helpful?'}
                        </button>
                        <span>Verified Canonical Answer</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              <p className="font-bold text-slate-800 text-xs">Have a doubt about {topicName}?</p>
              <p className="text-[11px] text-slate-500">
                Ask any question! We search canonical doubts first before generating a high-yield AI explanation.
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
                  : 'bg-slate-100 text-slate-800 mr-6 rounded-tl-none border border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] opacity-75 font-semibold">
                <span className="flex items-center gap-1">
                  {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3 text-indigo-600" />}
                  {msg.role === 'user' ? 'You' : 'AI Tutor'}
                </span>
                {msg.role === 'assistant' && (
                  <span>
                    {msg.servedFromFaq ? 'FAQ Answer ($0)' : 'AI Canonical Generated'}
                  </span>
                )}
              </div>
              {renderMessageContent(msg.content)}
            </div>
          ))
        )}

        {isLoading && (
          <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-600 text-xs flex items-center gap-2 w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Searching canonical doubts, then generating explanation...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

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
          placeholder="Ask another doubt about this lesson..."
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

