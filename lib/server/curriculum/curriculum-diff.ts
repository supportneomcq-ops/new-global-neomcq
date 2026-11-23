import { normalizeInput, calculateLevenshteinSimilarity } from '@/lib/knowledge/normalizer'
import {
  findMatchingSubjectInList,
  findMatchingTopicInList,
  findMatchingSubtopicInList,
} from '@/lib/server/exam-intelligence/curriculum-comparator'

export type CurriculumSpec = Array<{
  name: string
  description?: string
  weightage?: number
  topics: Array<{
    name: string
    description?: string
    subtopics: Array<{ name: string; description?: string }>
  }>
}>

type DiffIssue = {
  type: 'added' | 'not_in_current_syllabus' | 'duplicate' | 'renamed_candidate' | 'uncertain' | 'modified'
  level: 'subject' | 'topic' | 'subtopic'
  name: string
  path: string
  existingId?: string
  existingName?: string
  detail: string
}

function normalizedName(value: unknown): string {
  return normalizeInput(String(value || '')).canonical.toLowerCase().trim()
}

function normalizedText(value: unknown): string {
  return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()
}

export function validateStructuredSyllabus(spec: CurriculumSpec) {
  const errors: string[] = []
  const generic = /^(subject|topic|subtopic|module|unit|chapter)\s*\d*$/i
  if (!Array.isArray(spec) || spec.length === 0) return { valid:false, errors:['Official syllabus has no structured subjects.'] }
  for (const subject of spec) {
    if (!subject.name?.trim() || generic.test(subject.name.trim()) || !subject.topics?.length) {
      errors.push('Subject is unnamed, generic or has no topics: ' + (subject.name || '(unnamed)'))
      continue
    }
    for (const topic of subject.topics) {
      if (!topic.name?.trim() || generic.test(topic.name.trim()) || !topic.subtopics?.length) {
        errors.push('Topic is unnamed, generic or has no structured subtopics: ' + subject.name + ' / ' + (topic.name || '(unnamed)'))
        continue
      }
      for (const subtopic of topic.subtopics) {
        if (!subtopic.name?.trim() || generic.test(subtopic.name.trim())) {
          errors.push('Subtopic is unnamed or generic: ' + subject.name + ' / ' + topic.name)
        }
      }
    }
  }
  return { valid:errors.length===0, errors }
}

function modifiedFields(expected: any, existing: any, includeWeight = false): string[] {
  const fields: string[] = []
  if (expected.description && normalizedText(expected.description) !== normalizedText(existing.description)) fields.push('description')
  if (includeWeight && expected.weightage != null
    && (existing.weight_percentage == null || Math.abs(Number(expected.weightage) - Number(existing.weight_percentage)) > 0.01)) fields.push('weightage')
  return fields
}

function active(items: any[]): any[] {
  return (items || []).filter((item) => item.is_active !== false && item.active !== false)
}

function duplicateGroups(items: any[]): any[][] {
  const groups = new Map<string, any[]>()
  for (const item of active(items)) {
    const key = normalizedName(item.name)
    if (!key) continue
    groups.set(key, [...(groups.get(key) || []), item])
  }
  return [...groups.values()].filter((group) => group.length > 1)
}

function hasNearMatch(name: string, items: any[]): any | null {
  const target = normalizedName(name)
  let best: any = null
  let score = 0
  for (const item of active(items)) {
    const current = calculateLevenshteinSimilarity(target, normalizedName(item.name))
    if (current >= 80 && current > score) {
      best = item
      score = current
    }
  }
  return best ? { ...best, similarity: score } : null
}

/** Pure, conservative hierarchy diff. No database writes and no destructive actions. */
export function buildCurriculumDiff(spec: CurriculumSpec, persistedInput: any[]) {
  const persisted = active(persistedInput || [])
  const issues: DiffIssue[] = []
  const matchedSubjectIds = new Set<string>()
  let expectedSubjects = 0
  let matchedSubjects = 0
  let expectedTopics = 0
  let matchedTopics = 0
  let expectedSubtopics = 0
  let matchedSubtopics = 0

  for (const group of duplicateGroups(spec)) {
    issues.push({ type: 'duplicate', level: 'subject', name: group[0].name, path: 'official syllabus', detail: 'Duplicate subject names in official source.' })
  }
  for (const group of duplicateGroups(persisted)) {
    issues.push({ type: 'duplicate', level: 'subject', name: group[0].name, path: 'persisted curriculum', detail: 'Duplicate active subject rows; preserved for review.' })
  }

  const matchedTopicIds = new Set<string>()
  const matchedSubtopicIds = new Set<string>()

  for (const subject of spec) {
    expectedSubjects++
    for (const group of duplicateGroups(subject.topics)) {
      issues.push({ type: 'duplicate', level: 'topic', name: group[0].name, path: subject.name, detail: 'Duplicate topic names in official source.' })
    }
    for (const topic of subject.topics) {
      for (const group of duplicateGroups(topic.subtopics)) {
        issues.push({ type: 'duplicate', level: 'subtopic', name: group[0].name, path: subject.name + ' / ' + topic.name, detail: 'Duplicate subtopic names in official source.' })
      }
    }
    const matches = persisted.filter((row) => findMatchingSubjectInList(subject.name, [row]))
    const existingSubject = matches[0]
    if (!existingSubject) {
      const near = hasNearMatch(subject.name, persisted)
      issues.push({
        type: near ? 'uncertain' : 'added',
        level: 'subject',
        name: subject.name,
        path: 'official syllabus',
        existingId: near?.id,
        existingName: near?.name,
        detail: near ? 'Possible renamed subject; manual review required before insertion.' : 'Subject exists in the official syllabus but not in the persisted hierarchy.',
      })
      expectedTopics += subject.topics.length
      expectedSubtopics += subject.topics.reduce((sum, topic) => sum + topic.subtopics.length, 0)
      for (const topic of subject.topics) {
        issues.push({ type: 'added', level: 'topic', name: topic.name, path: subject.name, detail: 'Topic will be created with its missing parent after approval.' })
        for (const subtopic of topic.subtopics) {
          issues.push({ type: 'added', level: 'subtopic', name: subtopic.name, path: subject.name + ' / ' + topic.name, detail: 'Subtopic will be created with its missing hierarchy after approval.' })
        }
      }
      continue
    }

    matchedSubjects++
    matchedSubjectIds.add(existingSubject.id)
    if (normalizedName(existingSubject.name) !== normalizedName(subject.name)) {
      issues.push({ type: 'renamed_candidate', level: 'subject', name: subject.name, path: 'official syllabus', existingId: existingSubject.id, existingName: existingSubject.name, detail: 'Name differs from the matched persisted subject; no automatic rename will occur.' })
    }
    const subjectChanges = modifiedFields(subject, existingSubject, true)
    if (subjectChanges.length) {
      issues.push({ type: 'modified', level: 'subject', name: subject.name, path: 'official syllabus', existingId: existingSubject.id, existingName: existingSubject.name, detail: 'Official fields differ from the stored subject: ' + subjectChanges.join(', ') + '. No automatic update will occur.' })
    }

    const oldTopics = active(existingSubject.exam_topics || [])
    for (const group of duplicateGroups(oldTopics)) {
      issues.push({ type: 'duplicate', level: 'topic', name: group[0].name, path: existingSubject.name, detail: 'Duplicate active topic rows; preserved for review.' })
    }

    for (const topic of subject.topics) {
      expectedTopics++
      const existingTopic = oldTopics.find((row) => findMatchingTopicInList(topic.name, [row], subject.name))
      if (!existingTopic) {
        const near = hasNearMatch(topic.name, oldTopics)
        issues.push({
          type: near ? 'uncertain' : 'added',
          level: 'topic',
          name: topic.name,
          path: subject.name,
          existingId: near?.id,
          existingName: near?.name,
          detail: near ? 'Possible renamed topic; manual review required before insertion.' : 'Topic exists in the official syllabus but not under this subject.',
        })
        expectedSubtopics += topic.subtopics.length
        for (const subtopic of topic.subtopics) {
          issues.push({ type: 'added', level: 'subtopic', name: subtopic.name, path: subject.name + ' / ' + topic.name, detail: 'Subtopic will be created after its missing topic is approved.' })
        }
        continue
      }

      matchedTopics++
      matchedTopicIds.add(existingTopic.id)
      if (normalizedName(existingTopic.name) !== normalizedName(topic.name)) {
        issues.push({ type: 'renamed_candidate', level: 'topic', name: topic.name, path: subject.name, existingId: existingTopic.id, existingName: existingTopic.name, detail: 'Name differs from the matched persisted topic; no automatic rename will occur.' })
      }
      const topicChanges = modifiedFields(topic, existingTopic)
      if (topicChanges.length) {
        issues.push({ type: 'modified', level: 'topic', name: topic.name, path: subject.name, existingId: existingTopic.id, existingName: existingTopic.name, detail: 'Official fields differ from the stored topic: ' + topicChanges.join(', ') + '. No automatic update will occur.' })
      }

      const oldSubtopics = active(existingTopic.exam_subtopics || [])
      for (const group of duplicateGroups(oldSubtopics)) {
        issues.push({ type: 'duplicate', level: 'subtopic', name: group[0].name, path: subject.name + ' / ' + existingTopic.name, detail: 'Duplicate active subtopic rows; preserved for review.' })
      }
      for (const subtopic of topic.subtopics) {
        expectedSubtopics++
        const existingSubtopic = oldSubtopics.find((row) => findMatchingSubtopicInList(subtopic.name, [row], topic.name))
        if (!existingSubtopic) {
          const near = hasNearMatch(subtopic.name, oldSubtopics)
          issues.push({
            type: near ? 'uncertain' : 'added',
            level: 'subtopic',
            name: subtopic.name,
            path: subject.name + ' / ' + topic.name,
            existingId: near?.id,
            existingName: near?.name,
            detail: near ? 'Possible renamed subtopic; manual review required before insertion.' : 'Subtopic exists in the official syllabus but not under this topic.',
          })
          continue
        }
        matchedSubtopics++
        matchedSubtopicIds.add(existingSubtopic.id)
        if (normalizedName(existingSubtopic.name) !== normalizedName(subtopic.name)) {
          issues.push({ type: 'renamed_candidate', level: 'subtopic', name: subtopic.name, path: subject.name + ' / ' + topic.name, existingId: existingSubtopic.id, existingName: existingSubtopic.name, detail: 'Name differs from the matched persisted subtopic; no automatic rename will occur.' })
        }
        const subtopicChanges = modifiedFields(subtopic, existingSubtopic)
        if (subtopicChanges.length) {
          issues.push({ type: 'modified', level: 'subtopic', name: subtopic.name, path: subject.name + ' / ' + topic.name, existingId: existingSubtopic.id, existingName: existingSubtopic.name, detail: 'Official fields differ from the stored subtopic: ' + subtopicChanges.join(', ') + '. No automatic update will occur.' })
        }
      }
      for (const oldSubtopic of oldSubtopics) {
        if (!matchedSubtopicIds.has(oldSubtopic.id) && !topic.subtopics.some((item) => findMatchingSubtopicInList(item.name, [oldSubtopic], topic.name))) {
          issues.push({ type: 'not_in_current_syllabus', level: 'subtopic', name: oldSubtopic.name, path: subject.name + ' / ' + existingTopic.name, existingId: oldSubtopic.id, detail: 'Not present in the selected official syllabus; retained without deactivation.' })
        }
      }
    }
    for (const oldTopic of oldTopics) {
      if (!matchedTopicIds.has(oldTopic.id) && !subject.topics.some((item) => findMatchingTopicInList(item.name, [oldTopic], subject.name))) {
        issues.push({ type: 'not_in_current_syllabus', level: 'topic', name: oldTopic.name, path: existingSubject.name, existingId: oldTopic.id, detail: 'Not present in the selected official syllabus; retained without deactivation.' })
      }
    }
  }

  for (const oldSubject of persisted) {
    if (!matchedSubjectIds.has(oldSubject.id) && !spec.some((item) => findMatchingSubjectInList(item.name, [oldSubject]))) {
      issues.push({ type: 'not_in_current_syllabus', level: 'subject', name: oldSubject.name, path: 'persisted curriculum', existingId: oldSubject.id, detail: 'Not present in the selected official syllabus; retained without deactivation.' })
    }
  }

  const expectedTotal = expectedSubjects + expectedTopics + expectedSubtopics
  const matchedTotal = matchedSubjects + matchedTopics + matchedSubtopics
  const coveragePercentage = expectedTotal ? Math.round((matchedTotal / expectedTotal) * 10000) / 100 : 0
  const blockingIssues = issues.filter((issue) => ['duplicate', 'renamed_candidate', 'uncertain', 'modified'].includes(issue.type))
  return {
    status: issues.length ? 'needs_review' : 'ready_for_review',
    expected: { subjects: expectedSubjects, topics: expectedTopics, subtopics: expectedSubtopics, total: expectedTotal },
    matched: { subjects: matchedSubjects, topics: matchedTopics, subtopics: matchedSubtopics, total: matchedTotal },
    coveragePercentage,
    additions: issues.filter((issue) => issue.type === 'added'),
    notInCurrentSyllabus: issues.filter((issue) => issue.type === 'not_in_current_syllabus'),
    duplicates: issues.filter((issue) => issue.type === 'duplicate'),
    modified: issues.filter((issue) => issue.type === 'modified'),
    renamedCandidates: issues.filter((issue) => issue.type === 'renamed_candidate'),
    uncertain: issues.filter((issue) => issue.type === 'uncertain'),
    issues,
    blockingIssueCount: blockingIssues.length,
    canApplyMissing: blockingIssues.length === 0,
  }
}

