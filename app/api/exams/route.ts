import { NextRequest, NextResponse } from 'next/server';

export interface ExamItem {
  id: string;
  name: string;
  category: string;
  country: string;
  code: string;
  flag: string;
  description: string;
  is_featured: boolean;
}

const GLOBAL_EXAMS_DATABASE: ExamItem[] = [
  // Medical & Healthcare
  { id: '1', name: 'USMLE Step 1 & 2 CK', category: 'Medical Licensing Exam', country: 'United States', flag: '🇺🇸', description: 'United States Medical Licensing Examination for physicians.', code: 'USMLE', is_featured: true },
  { id: '2', name: 'NEET PG / INI-CET', category: 'Medical Entrance', country: 'India', flag: '🇮🇳', description: 'National Eligibility cum Entrance Test for postgraduate medicine.', code: 'NEETPG', is_featured: true },
  { id: '3', name: 'PLAB 1 / UKMLA', category: 'Medical Licensing Exam', country: 'United Kingdom', flag: '🇬🇧', description: 'GMC licensing test for international medical graduates in the UK.', code: 'PLAB', is_featured: true },
  { id: '4', name: 'NCLEX-RN Nursing', category: 'Nursing Board Exam', country: 'United States & Canada', flag: '🇺🇸', description: 'National Council Licensure Examination for Registered Nurses.', code: 'NCLEX', is_featured: true },
  { id: '5', name: 'FMGE Medical Licensing', category: 'Foreign Medical Graduate Exam', country: 'India', flag: '🇮🇳', description: 'NBE Screening Test for foreign medical graduates in India.', code: 'FMGE', is_featured: true },
  { id: '6', name: 'AMC MCQ Exam', category: 'Medical Council Exam', country: 'Australia', flag: '🇦🇺', description: 'Australian Medical Council computer adaptive exam.', code: 'AMC', is_featured: true },
  { id: '7', name: 'MCCQE Part I', category: 'Medical Council Exam', country: 'Canada', flag: '🇨🇦', description: 'Medical Council of Canada Qualifying Examination.', code: 'MCCQE', is_featured: true },
  { id: '8', name: 'MRCP Part 1 & 2', category: 'Royal College Exam', country: 'United Kingdom', flag: '🇬🇧', description: 'Membership of the Royal Colleges of Physicians of the UK.', code: 'MRCP', is_featured: true },
  { id: '9', name: 'DHA / MOH / HAAD', category: 'Healthcare Licensing', country: 'United Arab Emirates', flag: '🇦🇪', description: 'UAE Health Authority medical license examination.', code: 'DHA', is_featured: true },
  
  // Civil Services & Government
  { id: '10', name: 'UPSC Civil Services CSE', category: 'Civil Services Exam', country: 'India', flag: '🇮🇳', description: 'Premier civil service examination for IAS, IPS & IFS officer cadres.', code: 'UPSC', is_featured: true },
  { id: '11', name: 'SSC CGL / CHSL', category: 'Staff Selection Commission', country: 'India', flag: '🇮🇳', description: 'Combined Graduate Level examination for government positions.', code: 'SSC', is_featured: true },
  { id: '12', name: 'IBPS PO / Clerk', category: 'Banking Services', country: 'India', flag: '🇮🇳', description: 'Institute of Banking Personnel Selection officer recruitment.', code: 'IBPS', is_featured: true },
  
  // Accounting & Finance
  { id: '13', name: 'CA Final / Inter', category: 'Chartered Accountancy', country: 'India', flag: '🇮🇳', description: 'ICAI Chartered Accountancy professional examination.', code: 'CA', is_featured: true },
  { id: '14', name: 'CFA Level I / II / III', category: 'Financial Analyst', country: 'Global (180+ Countries)', flag: '🌍', description: 'Global charter for investment and financial analysts.', code: 'CFA', is_featured: true },
  { id: '15', name: 'US CPA Exam', category: 'Public Accountancy', country: 'United States', flag: '🇺🇸', description: 'AICPA Certified Public Accountant licensing examination.', code: 'CPA', is_featured: true },
  { id: '16', name: 'ACCA Global Knowledge', category: 'Global Accountancy', country: 'Global (180+ Countries)', flag: '🌍', description: 'Association of Chartered Certified Accountants qualification.', code: 'ACCA', is_featured: true },

  // Higher Ed & Graduate Entrance
  { id: '17', name: 'SAT College Entrance', category: 'College Board Entrance', country: 'Global (180+ Countries)', flag: '🎓', description: 'Scholastic Assessment Test for undergraduate admissions.', code: 'SAT', is_featured: true },
  { id: '18', name: 'GRE General Test', category: 'Graduate Admissions', country: 'Global (180+ Countries)', flag: '🌍', description: 'Graduate Record Examination for MS & PhD admissions.', code: 'GRE', is_featured: true },
  { id: '19', name: 'GMAT Focus Edition', category: 'MBA Admissions', country: 'Global (180+ Countries)', flag: '💼', description: 'Graduate Management Admission Test for top business schools.', code: 'GMAT', is_featured: true },
  { id: '20', name: 'JEE Advanced & Main', category: 'Engineering Entrance', country: 'India', flag: '🇮🇳', description: 'Premier engineering entrance examination for IITs and NITs.', code: 'JEE', is_featured: true },
  { id: '21', name: 'GATE Engineering', category: 'Engineering & Technology', country: 'India', flag: '🇮🇳', description: 'Graduate Aptitude Test in Engineering for M.Tech & PSUs.', code: 'GATE', is_featured: true },

  // Language & Global Proficiency
  { id: '22', name: 'IELTS Academic', category: 'English Proficiency', country: 'Global (180+ Countries)', flag: '🇬🇧', description: 'International English Language Testing System.', code: 'IELTS', is_featured: true },
  { id: '23', name: 'TOEFL iBT', category: 'English Language Test', country: 'Global (180+ Countries)', flag: '🇺🇸', description: 'Test of English as a Foreign Language for university entry.', code: 'TOEFL', is_featured: true },
  { id: '24', name: 'JLPT N5-N1 Japanese', category: 'Language Proficiency', country: 'Japan', flag: '🇯🇵', description: 'Japanese Language Proficiency Test for global learners.', code: 'JLPT', is_featured: true },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const featuredOnly = searchParams.get('featured') === 'true';
  const query = searchParams.get('q')?.toLowerCase();

  let exams = GLOBAL_EXAMS_DATABASE;

  if (featuredOnly) {
    exams = exams.filter((e) => e.is_featured);
  }

  if (query) {
    exams = exams.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        e.code.toLowerCase().includes(query)
    );
  }

  return NextResponse.json({
    success: true,
    total: exams.length,
    exams,
  });
}
