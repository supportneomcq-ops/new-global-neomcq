'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Layers,
  FileText,
  Search,
  ChevronRight,
  Sparkles,
  Tag,
  X
} from 'lucide-react';

export function AdminHierarchyManager() {
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected Subject for Topic Filtering
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Modals / Form State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectFormData, setSubjectFormData] = useState({
    id: '',
    name: '',
    slug: '',
    description: '',
    weight_percentage: 15,
    order_index: 0,
    status: 'published',
  });

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicFormData, setTopicFormData] = useState({
    id: '',
    subject_id: '',
    name: '',
    slug: '',
    parent_topic_id: '',
    level: 'topic',
    weight_percentage: 5,
    order_index: 0,
    tags: '',
  });

  // 1. Fetch List of Exams on load
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch('/api/admin/exams');
        const data = await res.json();
        if (data.success && data.exams.length > 0) {
          setExams(data.exams);
          setSelectedExamId(data.exams[0].id);
        }
      } catch (err) {
        console.error('Failed to load exams:', err);
      }
    };
    fetchExams();
  }, []);

  // 2. Fetch Hierarchy (Subjects & Topics) when selectedExamId changes
  const fetchHierarchy = useCallback(async () => {
    if (!selectedExamId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/hierarchy?examId=${selectedExamId}`);
      const data = await res.json();
      if (data.success) {
        setSubjects(data.subjects || []);
        setTopics(data.topics || []);
        if (data.subjects.length > 0) {
          setSelectedSubjectId(data.subjects[0].id);
        } else {
          setSelectedSubjectId('');
        }
      } else {
        setErrorMsg(data.error || 'Failed to load hierarchy');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  }, [selectedExamId]);

  useEffect(() => {
    let mounted = true;
    const runFetch = async () => {
      if (mounted) {
        await fetchHierarchy();
      }
    };
    runFetch();
    return () => {
      mounted = false;
    };
  }, [fetchHierarchy]);

  // 3. Subject CRUD Handlers
  const handleOpenAddSubject = () => {
    setSubjectFormData({
      id: '',
      name: '',
      slug: '',
      description: '',
      weight_percentage: 15,
      order_index: subjects.length + 1,
      status: 'published',
    });
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (sub: any) => {
    setSubjectFormData({
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
      description: sub.description || '',
      weight_percentage: sub.weight_percentage || 15,
      order_index: sub.order_index || 0,
      status: sub.status || 'published',
    });
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const action = subjectFormData.id ? 'update' : 'create';
      const res = await fetch('/api/admin/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'subject',
          action,
          data: {
            ...subjectFormData,
            exam_id: selectedExamId,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Subject ${action === 'create' ? 'created' : 'updated'} successfully!`);
        setIsSubjectModalOpen(false);
        fetchHierarchy();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(data.error || 'Operation failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (subId: string, subName: string) => {
    if (!confirm(`Are you sure you want to delete Subject "${subName}"? All associated topics will be permanently removed.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'subject',
          action: 'delete',
          data: { id: subId },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Subject deleted');
        fetchHierarchy();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(data.error || 'Delete failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Topic CRUD Handlers
  const handleOpenAddTopic = () => {
    if (!selectedSubjectId) {
      alert('Please create or select a subject first!');
      return;
    }
    const currentSubjectTopics = topics.filter((t) => t.subject_id === selectedSubjectId);
    setTopicFormData({
      id: '',
      subject_id: selectedSubjectId,
      name: '',
      slug: '',
      parent_topic_id: '',
      level: 'topic',
      weight_percentage: 5,
      order_index: currentSubjectTopics.length + 1,
      tags: 'High-Yield, Board-Favorite',
    });
    setIsTopicModalOpen(true);
  };

  const handleOpenEditTopic = (top: any) => {
    setTopicFormData({
      id: top.id,
      subject_id: top.subject_id,
      name: top.name,
      slug: top.slug,
      parent_topic_id: top.parent_topic_id || '',
      level: top.level || 'topic',
      weight_percentage: top.weight_percentage || 5,
      order_index: top.order_index || 0,
      tags: Array.isArray(top.tags) ? top.tags.join(', ') : '',
    });
    setIsTopicModalOpen(true);
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const action = topicFormData.id ? 'update' : 'create';
      const tagsArray = topicFormData.tags
        ? topicFormData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const res = await fetch('/api/admin/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'topic',
          action,
          data: {
            ...topicFormData,
            subject_id: selectedSubjectId,
            tags: tagsArray,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Topic ${action === 'create' ? 'created' : 'updated'} successfully!`);
        setIsTopicModalOpen(false);
        fetchHierarchy();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(data.error || 'Operation failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTopic = async (topicId: string, topicName: string) => {
    if (!confirm(`Delete topic "${topicName}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'topic',
          action: 'delete',
          data: { id: topicId },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Topic deleted');
        fetchHierarchy();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(data.error || 'Delete failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  const activeTopics = topics.filter((t) => t.subject_id === selectedSubjectId);

  return (
    <div className="space-y-6">
      {/* Top Banner & Exam Selection Header */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-heading font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#6D5BFF]" />
            <span>Subject & Topic Hierarchy Manager</span>
          </h3>
          <p className="text-xs text-slate-500">
            Structure official syllabi, assign blueprint weightages, and organize high-yield topics.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-400">Select Exam:</label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
          >
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Two Column Layout: Subjects (Left) & Topics (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Subjects List */}
        <div className="md:col-span-5 p-5 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-heading font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#00D4FF]" />
              <span>Subjects ({subjects.length})</span>
            </h4>
            <button
              onClick={handleOpenAddSubject}
              className="px-3 py-1.5 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold hover:opacity-90 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#6D5BFF]" />
              <span className="text-xs">Loading hierarchy...</span>
            </div>
          ) : subjects.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No subjects found for this exam. Click &quot;Add Subject&quot; above to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {subjects.map((sub) => {
                const isSelected = sub.id === selectedSubjectId;
                const subTopicsCount = topics.filter((t) => t.subject_id === sub.id).length;
                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#6D5BFF]/10 border-[#6D5BFF] text-[#6D5BFF]'
                        : 'bg-slate-50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-2">
                        <span>{sub.name}</span>
                        <span className="text-[10px] font-black text-slate-400">({sub.weight_percentage}%)</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {subTopicsCount} Topics • Order #{sub.order_index}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditSubject(sub);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-500 cursor-pointer"
                        title="Edit Subject"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubject(sub.id, sub.name);
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Topics List for Selected Subject */}
        <div className="md:col-span-7 p-5 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-heading font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-500" />
                <span>Topics in {activeSubject ? activeSubject.name : 'Selected Subject'}</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                {activeTopics.length} total topics & subconcepts
              </p>
            </div>

            <button
              onClick={handleOpenAddTopic}
              disabled={!selectedSubjectId}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Topic</span>
            </button>
          </div>

          {!selectedSubjectId ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Select a subject on the left to view and manage its topics.
            </div>
          ) : activeTopics.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No topics created yet for this subject. Click &quot;Add Topic&quot; above to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {activeTopics.map((top) => (
                <div
                  key={top.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{top.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#6D5BFF]/10 text-[#6D5BFF]">
                        {top.level || 'Topic'}
                      </span>
                    </div>
                    {top.tags && top.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {top.tags.map((tag: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-[10px] text-slate-500">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditTopic(top)}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-500 cursor-pointer"
                      title="Edit Topic"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTopic(top.id, top.name)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                      title="Delete Topic"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subject Modal */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 w-full max-w-md rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-extrabold text-base">
                {subjectFormData.id ? 'Edit Subject' : 'Add New Subject'}
              </h4>
              <button onClick={() => setIsSubjectModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={subjectFormData.name}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, name: e.target.value })}
                  placeholder="e.g. Cardiovascular Anatomy"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Slug</label>
                <input
                  type="text"
                  value={subjectFormData.slug}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, slug: e.target.value })}
                  placeholder="cardiovascular-anatomy"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Weight Percentage (%)</label>
                  <input
                    type="number"
                    value={subjectFormData.weight_percentage}
                    onChange={(e) => setSubjectFormData({ ...subjectFormData, weight_percentage: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Order Index</label>
                  <input
                    type="number"
                    value={subjectFormData.order_index}
                    onChange={(e) => setSubjectFormData({ ...subjectFormData, order_index: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-[#6D5BFF] text-white font-bold cursor-pointer flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Subject</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topic Modal */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 w-full max-w-md rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-extrabold text-base">
                {topicFormData.id ? 'Edit Topic' : 'Add New Topic'}
              </h4>
              <button onClick={() => setIsTopicModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 mb-1">Topic Name</label>
                <input
                  type="text"
                  required
                  value={topicFormData.name}
                  onChange={(e) => setTopicFormData({ ...topicFormData, name: e.target.value })}
                  placeholder="e.g. Coronary Circulation & Ischemic Heart Disease"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={topicFormData.tags}
                  onChange={(e) => setTopicFormData({ ...topicFormData, tags: e.target.value })}
                  placeholder="High-Yield, USMLE-Must-Know, ECG"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Hierarchy Level</label>
                  <select
                    value={topicFormData.level}
                    onChange={(e) => setTopicFormData({ ...topicFormData, level: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                  >
                    <option value="topic">Topic</option>
                    <option value="subtopic">Subtopic</option>
                    <option value="concept">Concept</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Order Index</label>
                  <input
                    type="number"
                    value={topicFormData.order_index}
                    onChange={(e) => setTopicFormData({ ...topicFormData, order_index: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTopicModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-white font-bold cursor-pointer flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Topic</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
