# Unified Just-In-Time AI Content Generation Plan

## 1. Overview & Architecture
This plan establishes an end-to-end automated content engine for **NeoMCQ**. When a student chooses any exam (such as **FMGE**, **USMLE Step 1**, **NEET PG**, etc.) and navigates to any subject, topic, or subtopic, the platform will automatically detect if comprehensive study material exists in the database. If missing or older than 30 days, the AI engine will immediately synthesize and persist the entire study suite for that exact curriculum target.

```
[User Selects Exam > Subject > Topic > Subtopic]
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
    [Content Cached in DB?]    [Missing or >30 Days?]
             │                   │
             ├─ YES ──> Instant Load (<200ms)
             │
             └─ NO  ──> Trigger Unified Multi-Feature Synthesis
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     ▼                           ▼                           ▼
[40+ MCQs & Quizzes]      [A4 Study Manuscript]      [Active Recall Blanks]
[Flashcards Deck]         [High-Yield Sticky Notes]  [5-Scene AI Tutor]
                                 │
                                 ▼
                     [Supabase DB Persistence]
                       (Fast Future Loads)
```

---

## 2. Core Feature Deliverables

### A. Automatic Trigger on Topic/Subtopic Selection
- **Where**: `lib/context/topic-content-context.tsx` and child workspaces.
- **Action**: When `selection.topic` or `selection.subtopic` changes, check database state across all asset tables.
- **Behavior**: If empty or incomplete, trigger the unified orchestrator seamlessly with a real-time preparation status indicator.

### B. Full-Suite Content Synthesis
The single orchestration pass will generate and persist all 7 core features:
1. **Practice MCQs & Quizzes (A & B)**:
   - 40+ clinical vignette and conceptual questions tailored to exam difficulty and exam blueprint.
   - Comprehensive explanation, distractor elimination logic, and high-yield takeaway pearls.
   - Persisted to Supabase `mcqs` and `content_versions` with exact topic and subtopic indexing.
2. **Study Notes (A4 Manuscript)**:
   - 3 to 5 multi-page formatted study notes covering Executive Summary, Comparative Matrix, and Exam Traps.
   - Persisted to `a4_notes` and `content_versions`.
3. **Flashcards**:
   - 20–30 front/back rapid-recall cards with difficulty tagging and clinical hooks.
4. **Fill in the Blanks (Active Recall)**:
   - 12–15 high-yield cloze questions requiring conceptual active recall, complete with accepted synonyms and board exam tips.
   - Persisted to `active_recall_items` and `content_versions`.
5. **Sticky Notes (Study Board)**:
   - 4–8 color-coded memory notes categorized by Board Traps, Clinical Pearls, Pharmacology, and High-Yield Rules.
   - Persisted to `user_sticky_notes`.
6. **AI Tutor Lesson**:
   - 5-scene visual interactive whiteboard lesson with timed cues and board actions.
   - Persisted to `tutor_lessons` and `tutor_scenes`.

### C. Persistent Storage Architecture (Where Content is Created)
All assets are saved permanently in Supabase relational tables:
- `content_versions`: Stores the master snapshot and quality score for each topic/subtopic.
- `mcqs`: Individual questions with choices, explanations, and subtopic tags.
- `a4_notes`: Structured multi-page study guides.
- `active_recall_items`: Cloze blanks with accepted synonym arrays.
- `user_sticky_notes`: Pinboard notes with color and category descriptors.
- `tutor_lessons`: Whiteboard scenes and timed audio/visual cue sequences.

---

## 3. Real-Time Educational Stepper
- When auto-generation begins, students see a clean, informative stepper displaying active stages:
  1. *Analyzing exam blueprint & syllabus guidelines*
  2. *Synthesizing 40+ clinical practice MCQs & assessment quizzes*
  3. *Structuring multi-page high-yield A4 study manuscript*
  4. *Generating active recall cloze blanks & memory flashcards*
  5. *Building memory sticky notes & interactive AI Tutor lesson*
  6. *Persisting content to database — Ready!*

---

## 4. Verification & Testing
1. Test switching between exams (e.g. FMGE, USMLE) and selecting an unpopulated topic.
2. Confirm the auto-generator activates, populates Supabase tables, and transitions to the live study view.
3. Switch tabs between Practice MCQs, Quizzes, Notes, Blanks, Sticky Notes, Flashcards, and AI Tutor to verify that every single tab renders rich content for the selected topic.
4. Reload the page to ensure cached content loads instantly without triggering unnecessary regeneration.
