import { GoogleGenAI } from '@google/genai'
import { getSupabaseAdmin } from '@/lib/supabase'
import { normalizeInput } from '@/lib/knowledge/normalizer'

export interface CurriculumSubjectData {
  name: string
  description: string
  weight: number
  topics: string[]
}

// Canonical high-yield starter topic mappings for primary examinations
const STANDARD_CURRICULUM_TEMPLATES: Record<string, CurriculumSubjectData[]> = {
  fmge: [
    {
      name: 'Anatomy',
      description: 'Gross anatomy, embryology, neuroanatomy, and histology for FMGE.',
      weight: 8,
      topics: ['Upper & Lower Limb Anatomy', 'Thorax & Cardiovascular Anatomy', 'Neuroanatomy & Cranial Nerves', 'Abdomen & Pelvis', 'General Embryology'],
    },
    {
      name: 'Physiology',
      description: 'Organ systems, cellular mechanisms, and physiological regulation.',
      weight: 8,
      topics: ['Cardiovascular Hemodynamics & ECG', 'Respiratory Mechanics & Gas Exchange', 'Renal Physiology & Acid-Base', 'Neurophysiology & Synaptic Transmission', 'Endocrinology & Reproduction'],
    },
    {
      name: 'Biochemistry',
      description: 'Metabolism, molecular genetics, and biochemical pathways.',
      weight: 7,
      topics: ['Carbohydrate & Lipid Metabolism', 'Amino Acid & Protein Metabolism', 'Enzymes & Clinical Enzymology', 'Molecular Biology & Genetics', 'Vitamins & Trace Elements'],
    },
    {
      name: 'Pharmacology',
      description: 'Mechanism of action, clinical uses, and adverse effects of drugs.',
      weight: 8,
      topics: ['Autonomic Nervous System Drugs', 'Cardiovascular & Antihypertensive Drugs', 'Antimicrobial Chemotherapy', 'CNS & Neuropharmacology', 'Endocrine & Chemotherapeutic Agents'],
    },
    {
      name: 'Pathology',
      description: 'General mechanisms of disease and systemic pathology.',
      weight: 8,
      topics: ['Cell Injury, Inflammation & Repair', 'Neoplasia & Tumor Markers', 'Cardiovascular & Respiratory Pathology', 'Hematology & Anemias', 'Renal & Hepatic Pathology'],
    },
    {
      name: 'Microbiology',
      description: 'Bacteriology, virology, mycology, and parasitology.',
      weight: 7,
      topics: ['General & Systemic Bacteriology', 'Clinical Virology (HIV, Hepatitis)', 'Medical Mycology', 'Parasitology & Helminths', 'Immunology & Vaccines'],
    },
    {
      name: 'Forensic Medicine & Toxicology',
      description: 'Medical jurisprudence, autopsy, and toxicology.',
      weight: 5,
      topics: ['Thanatology & Postmortem Changes', 'Mechanical & Thermal Injuries', 'Medical Ethics & Consumer Protection', 'Toxicology (Organophosphates, Heavy Metals)'],
    },
    {
      name: 'Community Medicine (PSM)',
      description: 'Epidemiology, biostatistics, and public health programs.',
      weight: 8,
      topics: ['Epidemiological Study Designs', 'Biostatistics & Demography', 'National Health Programs in India', 'Immunization & Maternal Child Health', 'Nutrition & Environmental Health'],
    },
    {
      name: 'General Medicine',
      description: 'Internal medicine, diagnostics, and management protocols.',
      weight: 12,
      topics: ['Cardiology & Ischemic Heart Disease', 'Pulmonology & Infectious Diseases', 'Neurology & Stroke Management', 'Nephrology & Electrolyte Disorders', 'Endocrinology (Diabetes, Thyroid)'],
    },
    {
      name: 'General Surgery',
      description: 'Surgical principles, trauma, and operative management.',
      weight: 10,
      topics: ['Trauma & Shock Management', 'Gastrointestinal & Hepatobiliary Surgery', 'Breast & Endocrine Surgery', 'Urology & Genitourinary Surgery', 'Wound Healing & Burns'],
    },
    {
      name: 'Obstetrics & Gynecology',
      description: 'Antenatal care, labor management, and gynecological pathology.',
      weight: 10,
      topics: ['Physiology of Pregnancy & Antenatal Care', 'Labor Management & Complications', 'Hypertensive Disorders of Pregnancy', 'Gynecological Malignancies', 'Menstrual Disorders & Infertility'],
    },
    {
      name: 'Pediatrics',
      description: 'Neonatology, growth, development, and pediatric illnesses.',
      weight: 6,
      topics: ['Neonatal Resuscitation & High-Risk Newborns', 'Growth & Developmental Milestones', 'Pediatric Infections & Immunization', 'Genetic & Metabolic Disorders'],
    },
    {
      name: 'Ophthalmology',
      description: 'Ocular anatomy, diseases, refraction, and surgical interventions.',
      weight: 4,
      topics: ['Cornea & Conjunctival Disorders', 'Cataract & Glaucoma Management', 'Retinal Diseases & Diabetic Retinopathy', 'Neuro-ophthalmology & Strabismus'],
    },
    {
      name: 'Otorhinolaryngology (ENT)',
      description: 'Ear, nose, throat, and head & neck diseases.',
      weight: 4,
      topics: ['Otology & Hearing Loss', 'Rhinosinusitis & Epistaxis', 'Pharyngitis, Tonsillitis & Laryngeal Pathology', 'Head & Neck Neoplasms'],
    },
  ],
}

/**
 * Ensures an exam has canonical subjects and topics populated lazily.
 * If already populated, returns existing structure without making AI calls.
 */
export async function ensureExamCurriculum(examId: string, examName: string, examSlug?: string): Promise<{
  subjectsCount: number
  topicsCount: number
  isReady: boolean
}> {
  const supabase = getSupabaseAdmin()

  // 1. Check if curriculum already exists for this exam
  const { data: existingSubjects, error: subErr } = await (supabase as any)
    .from('exam_subjects')
    .select('id, name, exam_topics(id, name)')
    .eq('exam_id', examId)

  if (existingSubjects && existingSubjects.length > 0) {
    const totalTopics = existingSubjects.reduce(
      (acc: number, s: any) => acc + (s.exam_topics?.length || 0),
      0
    )
    return {
      subjectsCount: existingSubjects.length,
      topicsCount: totalTopics,
      isReady: true,
    }
  }

  // 2. Identify curriculum source template
  const slugKey = (examSlug || normalizeInput(examName).slug).toLowerCase()
  let templateData: CurriculumSubjectData[] | null = STANDARD_CURRICULUM_TEMPLATES[slugKey] || null

  // 3. If no pre-mapped template, use AI to generate official canonical curriculum structure
  if (!templateData && process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
      const prompt = `You are a curriculum architect for professional certification and licensing exams.
Generate the standard canonical subjects and 4 core high-yield topics for the official examination: "${examName}".
Return ONLY a valid JSON array of objects with the following structure:
[
  {
    "name": "Subject Name",
    "description": "Short 1-sentence description of syllabus focus",
    "weight": 15,
    "topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]
  }
]
Provide 5 to 10 canonical subjects based strictly on the official syllabus.`

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      })

      const text = response.text || '[]'
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      if (Array.isArray(parsed) && parsed.length > 0) {
        templateData = parsed
      }
    } catch (aiErr) {
      console.warn('AI curriculum synthesis note:', aiErr)
    }
  }

  // Fallback if AI or template unavailable
  if (!templateData || templateData.length === 0) {
    templateData = [
      {
        name: 'General Core Foundations',
        description: `Foundational syllabus content for ${examName}`,
        weight: 30,
        topics: ['Core Principles & Definitions', 'Standard Methodologies', 'Applied & Practical Applications'],
      },
      {
        name: 'Advanced Practice & Problem Solving',
        description: `Advanced domain questions and problem sets for ${examName}`,
        weight: 35,
        topics: ['Complex Case Scenarios', 'Analytical & Decision Frameworks', 'High-Frequency Exam Traps'],
      },
      {
        name: 'Ethics, Regulations & Standards',
        description: `Standards, ethics, and professional guidelines for ${examName}`,
        weight: 35,
        topics: ['Professional Ethics', 'Regulatory Standards & Safety', 'Best Practices'],
      },
    ]
  }

  // 4. Batch insert subjects and topics into Supabase
  let insertedSubjectsCount = 0
  let insertedTopicsCount = 0

  for (const item of templateData) {
    const { data: sub, error: subInsertErr } = await (supabase as any)
      .from('exam_subjects')
      .insert({
        exam_id: examId,
        name: item.name,
        description: item.description,
        weight_percentage: item.weight || 10,
      })
      .select('id, name')
      .single()

    if (sub) {
      insertedSubjectsCount++
      const topicInserts = (item.topics || []).map((tName) => ({
        subject_id: sub.id,
        name: tName,
        description: `Topic ${tName} under ${sub.name}`,
      }))

      if (topicInserts.length > 0) {
        const { data: tops } = await (supabase as any)
          .from('exam_topics')
          .insert(topicInserts)
          .select('id')

        if (tops) {
          insertedTopicsCount += tops.length
        }
      }
    }
  }

  return {
    subjectsCount: insertedSubjectsCount,
    topicsCount: insertedTopicsCount,
    isReady: true,
  }
}
