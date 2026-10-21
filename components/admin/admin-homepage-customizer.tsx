'use client';

import React, { useState, useEffect } from 'react';
import {
  HomepageConfig,
  getHomepageConfig,
  saveHomepageConfig,
  resetHomepageConfig,
  DEFAULT_HOMEPAGE_CONFIG,
  ExamItem,
  FeatureItem,
  TestimonialItem,
  PricingPlan,
  FaqItem,
} from '@/lib/homepage-config';
import {
  Settings,
  X,
  RotateCcw,
  Save,
  Download,
  Upload,
  Eye,
  Sparkles,
  Layout,
  Layers,
  BookOpen,
  CheckSquare,
  HelpCircle,
  Quote,
  DollarSign,
  Image as ImageIcon,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';

interface AdminHomepageCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminHomepageCustomizer({ isOpen, onClose }: AdminHomepageCustomizerProps) {
  const [config, setConfig] = useState<HomepageConfig>(getHomepageConfig);
  const [activeTab, setActiveTab] = useState<'hero' | 'visibility' | 'exams' | 'features' | 'demo' | 'why' | 'testimonials' | 'pricing' | 'faq'>('hero');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'reset'>('idle');

  useEffect(() => {
    if (isOpen) {
      setConfig(getHomepageConfig());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveHomepageConfig(config);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all homepage customizations back to default?')) {
      const reset = resetHomepageConfig();
      setConfig(reset);
      setSaveStatus('reset');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleExport = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(config, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', 'neomcq-homepage-config.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.hero) {
          setConfig(parsed);
          saveHomepageConfig(parsed);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      } catch {
        alert('Invalid JSON configuration file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 text-slate-100 h-full overflow-hidden shadow-2xl flex flex-col border-l border-slate-800">
        
        {/* Header Bar */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600/30 text-cyan-400 border border-violet-500/40">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
                <span>Homepage Customizer</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                  LIVE ADMIN MODE
                </span>
              </h3>
              <p className="text-xs text-slate-400">Customize text, banners, images, and section visibility without code.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 text-white font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save & Apply Live</span>
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              title="Export config JSON"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            <label
              title="Import config JSON"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>

        {/* Saved feedback */}
        {saveStatus === 'saved' && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300 px-4 py-2 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Homepage changes saved and applied live!</span>
          </div>
        )}
        {saveStatus === 'reset' && (
          <div className="bg-amber-950/80 border-b border-amber-500/40 text-amber-300 px-4 py-2 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Reset to default homepage settings.</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-slate-950 border-b border-slate-800 overflow-x-auto text-xs shrink-0">
          <button
            onClick={() => setActiveTab('hero')}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
              activeTab === 'hero' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hero & Banner</span>
          </button>

          <button
            onClick={() => setActiveTab('visibility')}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
              activeTab === 'visibility' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sections</span>
          </button>

          <button
            onClick={() => setActiveTab('exams')}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
              activeTab === 'exams' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Exams</span>
          </button>

          <button
            onClick={() => setActiveTab('features')}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
              activeTab === 'features' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Features</span>
          </button>

          <button
            onClick={() => setActiveTab('demo')}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
              activeTab === 'demo' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Interactive Demo</span>
          </button>

          <button
            onClick={() => setActiveTab('testimonials')}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
              activeTab === 'testimonials' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Quote className="w-3.5 h-3.5" />
            <span>Reviews</span>
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
              activeTab === 'pricing' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Pricing</span>
          </button>

          <button
            onClick={() => setActiveTab('faq')}
            className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
              activeTab === 'faq' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQs</span>
          </button>
        </div>

        {/* Editor Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: HERO & ANNOUNCEMENT */}
          {activeTab === 'hero' && (
            <div className="space-y-6 text-xs">
              
              {/* Top Announcement Ticker */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-cyan-400">Top Announcement Banner</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.announcement.enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          announcement: { ...config.announcement, enabled: e.target.checked },
                        })
                      }
                      className="rounded accent-violet-600"
                    />
                    <span>Enabled</span>
                  </label>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Banner Text</label>
                  <input
                    type="text"
                    value={config.announcement.text}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        announcement: { ...config.announcement, text: e.target.value },
                      })
                    }
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={config.announcement.badge}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          announcement: { ...config.announcement, badge: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">CTA Text</label>
                    <input
                      type="text"
                      value={config.announcement.ctaText}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          announcement: { ...config.announcement, ctaText: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Main Hero Config */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-4">
                <h4 className="font-bold text-sm text-violet-400">Hero Content & Visuals</h4>

                <div>
                  <label className="block text-slate-400 mb-1">Hero Top Badge</label>
                  <input
                    type="text"
                    value={config.hero.badgeText}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        hero: { ...config.hero, badgeText: e.target.value },
                      })
                    }
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Headline Prefix</label>
                    <input
                      type="text"
                      value={config.hero.headlinePrefix}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, headlinePrefix: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Gradient Highlight 1</label>
                    <input
                      type="text"
                      value={config.hero.headlineGradient1}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, headlineGradient1: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Subtitle Line</label>
                  <input
                    type="text"
                    value={config.hero.subtitle}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        hero: { ...config.hero, subtitle: e.target.value },
                      })
                    }
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Paragraph Description</label>
                  <textarea
                    rows={3}
                    value={config.hero.description}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        hero: { ...config.hero, description: e.target.value },
                      })
                    }
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Primary CTA Button</label>
                    <input
                      type="text"
                      value={config.hero.primaryCtaText}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, primaryCtaText: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Secondary CTA Button</label>
                    <input
                      type="text"
                      value={config.hero.secondaryCtaText}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, secondaryCtaText: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Hero Right Column Visual</label>
                  <select
                    value={config.hero.heroVisualType}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        hero: {
                          ...config.hero,
                          heroVisualType: e.target.value as any,
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="ai_orb">Interactive AI Neural Orb</option>
                    <option value="3d_student">3D Student with Laptop Illustration</option>
                    <option value="dashboard_preview">Live Dashboard Practice Mockup</option>
                    <option value="custom_image">Custom Banner Image URL</option>
                  </select>
                </div>

                {config.hero.heroVisualType === 'custom_image' && (
                  <div>
                    <label className="block text-slate-400 mb-1">Custom Image URL</label>
                    <input
                      type="text"
                      value={config.hero.customImageUrl || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, customImageUrl: e.target.value },
                        })
                      }
                      placeholder="https://..."
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: SECTIONS VISIBILITY */}
          {activeTab === 'visibility' && (
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-4 text-xs">
              <h4 className="font-bold text-sm text-cyan-400">Toggle Homepage Sections Visibility</h4>
              <p className="text-slate-400">Show or hide individual sections on the public homepage.</p>

              <div className="space-y-2">
                {Object.entries(config.visibility).map(([key, val]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer hover:bg-slate-850"
                  >
                    <span className="font-bold capitalize text-slate-200">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          visibility: { ...config.visibility, [key]: e.target.checked },
                        })
                      }
                      className="rounded accent-violet-600 w-4 h-4"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: EXAMS */}
          {activeTab === 'exams' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-violet-400">Exam Cards ({config.exams.length})</h4>
                <button
                  onClick={() => {
                    const newExam: ExamItem = {
                      id: `exam-${Date.now()}`,
                      title: 'New Exam Syllabus',
                      category: 'Medical',
                      questionCount: '5,000+ MCQs',
                      difficulty: 'Adaptive',
                      tags: ['High-Yield', 'AI Practice'],
                      icon: 'Stethoscope',
                      link: '/onboarding',
                    };
                    setConfig({ ...config, exams: [...config.exams, newExam] });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Exam</span>
                </button>
              </div>

              {config.exams.map((exam, idx) => (
                <div key={exam.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">Exam #{idx + 1}</span>
                    <button
                      onClick={() =>
                        setConfig({
                          ...config,
                          exams: config.exams.filter((e) => e.id !== exam.id),
                        })
                      }
                      className="p-1 rounded bg-rose-950/80 text-rose-300 hover:bg-rose-900 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Title</label>
                      <input
                        type="text"
                        value={exam.title}
                        onChange={(e) => {
                          const updated = [...config.exams];
                          updated[idx].title = e.target.value;
                          setConfig({ ...config, exams: updated });
                        }}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Category</label>
                      <select
                        value={exam.category}
                        onChange={(e) => {
                          const updated = [...config.exams];
                          updated[idx].category = e.target.value as any;
                          setConfig({ ...config, exams: updated });
                        }}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                      >
                        <option value="Medical">Medical</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Civil Services">Civil Services</option>
                        <option value="College Entrance">College Entrance</option>
                        <option value="Professional">Professional</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Question Count</label>
                      <input
                        type="text"
                        value={exam.questionCount}
                        onChange={(e) => {
                          const updated = [...config.exams];
                          updated[idx].questionCount = e.target.value;
                          setConfig({ ...config, exams: updated });
                        }}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Badge Tag</label>
                      <input
                        type="text"
                        value={exam.popularBadge || ''}
                        onChange={(e) => {
                          const updated = [...config.exams];
                          updated[idx].popularBadge = e.target.value;
                          setConfig({ ...config, exams: updated });
                        }}
                        placeholder="e.g. Popular"
                        className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: FEATURES */}
          {activeTab === 'features' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-sm text-cyan-400">Key Feature Cards</h4>
              {config.features.map((feat, idx) => (
                <div key={feat.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Title</label>
                      <input
                        type="text"
                        value={feat.title}
                        onChange={(e) => {
                          const updated = [...config.features];
                          updated[idx].title = e.target.value;
                          setConfig({ ...config, features: updated });
                        }}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Badge</label>
                      <input
                        type="text"
                        value={feat.badge || ''}
                        onChange={(e) => {
                          const updated = [...config.features];
                          updated[idx].badge = e.target.value;
                          setConfig({ ...config, features: updated });
                        }}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={feat.description}
                      onChange={(e) => {
                        const updated = [...config.features];
                        updated[idx].description = e.target.value;
                        setConfig({ ...config, features: updated });
                      }}
                      className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: DEMO */}
          {activeTab === 'demo' && (
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3 text-xs">
              <h4 className="font-bold text-sm text-amber-400">Interactive Sample Question Demo</h4>

              <div>
                <label className="block text-slate-400 mb-1">Exam Tag</label>
                <input
                  type="text"
                  value={config.demoQuestion.examTag}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      demoQuestion: { ...config.demoQuestion, examTag: e.target.value },
                    })
                  }
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Question Text</label>
                <textarea
                  rows={3}
                  value={config.demoQuestion.question}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      demoQuestion: { ...config.demoQuestion, question: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-slate-400">Options & Correct Index</label>
                {config.demoQuestion.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctIdx"
                      checked={config.demoQuestion.correctIndex === i}
                      onChange={() =>
                        setConfig({
                          ...config,
                          demoQuestion: { ...config.demoQuestion, correctIndex: i },
                        })
                      }
                      className="accent-emerald-500 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...config.demoQuestion.options];
                        newOpts[i] = e.target.value;
                        setConfig({
                          ...config,
                          demoQuestion: { ...config.demoQuestion, options: newOpts },
                        });
                      }}
                      className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-slate-400 mb-1">AI Explanation Rationale</label>
                <textarea
                  rows={3}
                  value={config.demoQuestion.explanation}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      demoQuestion: { ...config.demoQuestion, explanation: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded bg-slate-900 border border-slate-700 text-white"
                />
              </div>
            </div>
          )}

          {/* TAB 6: REVIEWS */}
          {activeTab === 'testimonials' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-sm text-emerald-400">Student Reviews & Pass Rates</h4>
              {config.testimonials.map((t, idx) => (
                <div key={t.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Student Name</label>
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => {
                          const updated = [...config.testimonials];
                          updated[idx].name = e.target.value;
                          setConfig({ ...config, testimonials: updated });
                        }}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Score Badge</label>
                      <input
                        type="text"
                        value={t.score}
                        onChange={(e) => {
                          const updated = [...config.testimonials];
                          updated[idx].score = e.target.value;
                          setConfig({ ...config, testimonials: updated });
                        }}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Quote</label>
                    <textarea
                      rows={2}
                      value={t.quote}
                      onChange={(e) => {
                        const updated = [...config.testimonials];
                        updated[idx].quote = e.target.value;
                        setConfig({ ...config, testimonials: updated });
                      }}
                      className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 7: PRICING */}
          {activeTab === 'pricing' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-sm text-violet-400">Pricing Plans</h4>
              {config.pricing.map((plan, idx) => (
                <div key={plan.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Plan Name</label>
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => {
                          const updated = [...config.pricing];
                          updated[idx].name = e.target.value;
                          setConfig({ ...config, pricing: updated });
                        }}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Monthly Price ($)</label>
                      <input
                        type="number"
                        value={plan.monthlyPrice}
                        onChange={(e) => {
                          const updated = [...config.pricing];
                          updated[idx].monthlyPrice = Number(e.target.value);
                          setConfig({ ...config, pricing: updated });
                        }}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Annual Price ($)</label>
                      <input
                        type="number"
                        value={plan.annualPrice}
                        onChange={(e) => {
                          const updated = [...config.pricing];
                          updated[idx].annualPrice = Number(e.target.value);
                          setConfig({ ...config, pricing: updated });
                        }}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 8: FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-sm text-cyan-400">FAQs</h4>
              {config.faqs.map((faq, idx) => (
                <div key={faq.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Question</label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const updated = [...config.faqs];
                        updated[idx].question = e.target.value;
                        setConfig({ ...config, faqs: updated });
                      }}
                      className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Answer</label>
                    <textarea
                      rows={2}
                      value={faq.answer}
                      onChange={(e) => {
                        const updated = [...config.faqs];
                        updated[idx].answer = e.target.value;
                        setConfig({ ...config, faqs: updated });
                      }}
                      className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
