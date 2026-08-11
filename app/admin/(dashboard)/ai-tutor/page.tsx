'use client';

import React from 'react';
import { Bot, Sliders, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AdminAITutorPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#6D5BFF]" />
            <span>AI Socratic Tutor Control</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Configure system prompts, temperature, pedagogical persona, and step-by-step reasoning rules.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-2">Tutor Model Persona</label>
            <select className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold focus:outline-none">
              <option>Strict Medical Attending Physician (Socratic Guidance)</option>
              <option>Encouraging Expert Exam Coach</option>
              <option>Direct Concise Fact Explainer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-2">Primary Reasoning Engine</label>
            <select className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold focus:outline-none">
              <option>Gemini 3.5 Flash (Production Default)</option>
              <option>Gemini 3.0 Pro (High Reasoning)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-2">Global System Instruction</label>
          <textarea
            rows={5}
            defaultValue="You are NeoMCQ AI Tutor. Guide students with Socratic questioning without immediately revealing the correct answer option unless explicitly asked. Break down clinical reasoning into pathophysiology, diagnostic tests, and treatment steps."
            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-mono focus:outline-none"
          />
        </div>

        <div className="flex justify-end">
          <button className="px-5 py-2.5 rounded-2xl bg-[#6D5BFF] text-white text-xs font-extrabold shadow-md hover:opacity-95">
            Save Tutor Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
