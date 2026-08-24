import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seedBatch2MasterTaxonomy() {
  console.log('--- Ingesting Batch 2 Authorities and Master Taxonomy ---');

  const { data: countries } = await supabase.from('countries').select('id, iso2').eq('iso2', 'IN');
  const indiaId = countries?.[0]?.id;

  // 1. Authorities to upsert
  const newAuthorities = [
    {
      country_id: indiaId,
      code: 'NABARD',
      name: 'National Bank for Agriculture and Rural Development',
      slug: 'nabard-india',
      short_name: 'NABARD',
      official_website: 'https://www.nabard.org',
      description: 'Apex development financial institution in India, responsible for the development of the small industries, cottage industries, agriculture and any other allied economic activities in rural areas.',
      headquarters: 'Mumbai, Maharashtra, India',
      established_year: 1982,
      verification_status: 'verified',
      source_url: 'https://www.nabard.org/careers-notices.aspx'
    },
    {
      country_id: indiaId,
      code: 'SEBI',
      name: 'Securities and Exchange Board of India',
      slug: 'sebi-india',
      short_name: 'SEBI',
      official_website: 'https://www.sebi.gov.in',
      description: 'Statutory regulatory body established by the Government of India to regulate the securities market and protect the interests of investors in securities.',
      headquarters: 'Mumbai, Maharashtra, India',
      established_year: 1992,
      verification_status: 'verified',
      source_url: 'https://www.sebi.gov.in/sebiweb/other/career.jsp'
    },
    {
      country_id: indiaId,
      code: 'RRB',
      name: 'Railway Recruitment Control Board',
      slug: 'rrb-indian-railways',
      short_name: 'RRB',
      official_website: 'https://indianrailways.gov.in',
      description: 'Central government recruitment organization under the Ministry of Railways, Government of India, conducting nationwide recruitment for technical, non-technical and safety categories in Indian Railways.',
      headquarters: 'Rail Bhavan, New Delhi, India',
      established_year: 1998,
      verification_status: 'verified',
      source_url: 'https://www.rrbcdg.gov.in'
    },
    {
      country_id: indiaId,
      code: 'IAF',
      name: 'Indian Air Force (Air Headquarters)',
      slug: 'iaf-afcat',
      short_name: 'IAF',
      official_website: 'https://afcat.cdac.in',
      description: 'Air arm of the Indian Armed Forces, conducting the Air Force Common Admission Test (AFCAT) for commissioning officers into Flying, Ground Duty (Technical) and Ground Duty (Non-Technical) branches.',
      headquarters: 'Vayu Bhavan, New Delhi, India',
      established_year: 1932,
      verification_status: 'verified',
      source_url: 'https://afcat.cdac.in'
    }
  ];

  for (const auth of newAuthorities) {
    const { data: existing } = await supabase.from('exam_authorities').select('id').eq('code', auth.code).maybeSingle();
    if (existing) {
      console.log(`Authority ${auth.code} already exists.`);
    } else {
      const { error } = await supabase.from('exam_authorities').insert(auth);
      if (error) console.error(`Error inserting authority ${auth.code}:`, error);
      else console.log(`Created authority ${auth.code}`);
    }
  }

  // 2. Master Subjects to upsert
  const newMasterSubjects = [
    { name: 'Civil Engineering', slug: 'civil-engineering', code: 'CE', description: 'Structural Analysis, Building Materials, Geotechnical, Fluid Mechanics, Environmental & Transportation Engineering.' },
    { name: 'Electrical Engineering', slug: 'electrical-engineering', code: 'EE', description: 'Circuit Theory, Electric Machines, Power Systems, Control Systems, Electrical Measurements & Power Electronics.' },
    { name: 'Mechanical Engineering', slug: 'mechanical-engineering', code: 'ME', description: 'Thermodynamics, Fluid Mechanics, Manufacturing Technology, Machine Design, Strength of Materials & Theory of Machines.' },
    { name: 'General Studies & Engineering Aptitude', slug: 'general-studies-engineering-aptitude', code: 'GSEA', description: 'Engineering Ethics, Project Management, Environmental Studies, ICT, Material Science & Standards.' },
    { name: 'Economic & Social Issues (ESI)', slug: 'economic-social-issues', code: 'ESI', description: 'Indian Economy, Social Structure, Poverty Alleviation, Employment Generation, Sustainable Development & Globalization.' },
    { name: 'Finance & Management', slug: 'finance-management', code: 'FM', description: 'Financial System in India, Financial Markets, Corporate Governance, Leadership, Motivation & Management Principles.' },
    { name: 'Agriculture & Rural Development (ARD)', slug: 'agriculture-rural-development', code: 'ARD', description: 'Agriculture Agronomy, Soil Conservation, Water Resource Management, Animal Husbandry & Rural Economy.' },
    { name: 'General Hindi Language', slug: 'general-hindi-language', code: 'HIN', description: 'Hindi Vyakaran, Vilom Shabd, Samanarthi Shabd, Muhavare, Sandhi, Samas aur Gadyansh.' },
    { name: 'Military Aptitude & Spatial Ability', slug: 'military-aptitude-spatial-ability', code: 'MASA', description: 'Spatial Ability, Embedded Figures, Figure Completion, Rotational Reasoning & Military Situational Awareness.' }
  ];

  for (const subj of newMasterSubjects) {
    const { data: existing } = await supabase.from('subjects').select('id').eq('slug', subj.slug).maybeSingle();
    if (existing) {
      console.log(`Master subject ${subj.slug} already exists.`);
    } else {
      const { error } = await supabase.from('subjects').insert({
        name: subj.name,
        slug: subj.slug,
        code: subj.code,
        description: subj.description,
        is_active: true,
        verification_status: 'verified'
      });
      if (error) console.error(`Error inserting subject ${subj.slug}:`, error);
      else console.log(`Created master subject ${subj.slug}`);
    }
  }

  console.log('Batch 2 Authorities & Subjects initialized.');
}

seedBatch2MasterTaxonomy().catch(console.error);
