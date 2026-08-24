import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function seedIndiaBatch1() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to PostgreSQL for India Catalog Batch 1 seeding.');

  // Get India Country ID
  const countryRes = await client.query(`SELECT id FROM countries WHERE iso2 = 'IN' LIMIT 1`);
  const indiaId = countryRes.rows[0]?.id;
  if (!indiaId) {
    throw new Error('India country record not found in countries table');
  }
  console.log('India Country ID:', indiaId);

  // Get Category Map
  const catRes = await client.query(`SELECT id, slug FROM exam_categories`);
  const categoryMap = {};
  catRes.rows.forEach(r => { categoryMap[r.slug] = r.id; });

  // 1. AUTHORITIES
  console.log('Seeding Exam Authorities...');
  const authorities = [
    {
      code: 'NBEMS',
      name: 'National Board of Examinations in Medical Sciences',
      short_name: 'NBEMS',
      slug: 'nbems-india',
      official_website: 'https://natboard.edu.in',
      description: 'Autonomous statutory body under the Ministry of Health and Family Welfare, Government of India, conducting postgraduate, post-doctoral and licensing medical examinations.',
      headquarters: 'New Delhi, India',
      established_year: 1975,
      source_url: 'https://natboard.edu.in'
    },
    {
      code: 'AIIMS',
      name: 'All India Institute of Medical Sciences New Delhi (INI Secretariat)',
      short_name: 'AIIMS / INI',
      slug: 'aiims-ini-exams',
      official_website: 'https://aiimsexams.ac.in',
      description: 'Apex medical institute established by an Act of Parliament, administering INI-CET and INI-SS examinations for premier Institutes of National Importance.',
      headquarters: 'Ansari Nagar, New Delhi, India',
      established_year: 1956,
      source_url: 'https://aiimsexams.ac.in'
    },
    {
      code: 'NTA',
      name: 'National Testing Agency',
      short_name: 'NTA',
      slug: 'nta-india',
      official_website: 'https://nta.ac.in',
      description: 'Premier, specialist, autonomous testing organization established by the Ministry of Education, Government of India, conducting NEET UG, JEE Main, CUET, and UGC NET.',
      headquarters: 'Okhla / Noida, India',
      established_year: 2017,
      source_url: 'https://nta.ac.in'
    },
    {
      code: 'UPSC',
      name: 'Union Public Service Commission',
      short_name: 'UPSC',
      slug: 'upsc-india',
      official_website: 'https://upsc.gov.in',
      description: 'Constitutional authority established under Article 315-323 of the Constitution of India, conducting recruitment to higher Civil Services and Defence Academy.',
      headquarters: 'Dholpur House, Shahjahan Road, New Delhi, India',
      established_year: 1926,
      source_url: 'https://upsc.gov.in'
    },
    {
      code: 'SSC',
      name: 'Staff Selection Commission',
      short_name: 'SSC',
      slug: 'ssc-india',
      official_website: 'https://ssc.gov.in',
      description: 'Government of India organization under the Department of Personnel and Training (DoPT) recruiting staff for Group B (Non-Gazetted) and Group C posts.',
      headquarters: 'CGO Complex, Lodhi Road, New Delhi, India',
      established_year: 1975,
      source_url: 'https://ssc.gov.in'
    },
    {
      code: 'IBPS',
      name: 'Institute of Banking Personnel Selection',
      short_name: 'IBPS',
      slug: 'ibps-india',
      official_website: 'https://ibps.in',
      description: 'Autonomous body governed by a board that includes nominees from RBI, Ministry of Finance, and public sector banks, conducting common recruitment for 11+ Public Sector Banks.',
      headquarters: 'Kandivali East, Mumbai, Maharashtra, India',
      established_year: 1975,
      source_url: 'https://ibps.in'
    },
    {
      code: 'SBI',
      name: 'State Bank of India Central Recruitment & Promotion Department',
      short_name: 'SBI CRPD',
      slug: 'sbi-recruitment',
      official_website: 'https://sbi.co.in/web/careers',
      description: 'Statutory corporation and largest commercial bank in India, conducting direct national recruitment for Probationary Officers, Junior Associates, and Specialist Officers.',
      headquarters: 'State Bank Bhavan, Madame Cama Road, Nariman Point, Mumbai, India',
      established_year: 1955,
      source_url: 'https://sbi.co.in/web/careers'
    },
    {
      code: 'RBI',
      name: 'Reserve Bank of India Services Board',
      short_name: 'RBI Services Board',
      slug: 'rbi-services-board',
      official_website: 'https://rbi.org.in',
      description: 'Autonomous statutory recruitment board of India’s central bank, conducting examinations for Grade B Officers and Assistants.',
      headquarters: 'Reserve Bank of India Building, Byculla Office, Mumbai, India',
      established_year: 1968,
      source_url: 'https://rbi.org.in'
    },
    {
      code: 'IIM_CAT',
      name: 'Indian Institutes of Management (CAT Convening Body)',
      short_name: 'IIM CAT',
      slug: 'iim-cat-committee',
      official_website: 'https://iimcat.ac.in',
      description: 'National committee of Indian Institutes of Management conducting the premier Common Admission Test for postgraduate management programs.',
      headquarters: 'Rotational among Indian Institutes of Management, India',
      established_year: 1984,
      source_url: 'https://iimcat.ac.in'
    },
    {
      code: 'IIT_JAB',
      name: 'Joint Admission Board (JAB) / Indian Institutes of Technology',
      short_name: 'IIT JAB',
      slug: 'iit-jab-exams',
      official_website: 'https://jeeadv.ac.in',
      description: 'Policy-making body representing 23 IITs for admissions to undergraduate engineering, science and architecture programs through JEE Advanced.',
      headquarters: 'Organizing IIT (Rotational), India',
      established_year: 1961,
      source_url: 'https://jeeadv.ac.in'
    },
    {
      code: 'GATE_NCB',
      name: 'National Coordination Board - GATE (IISc & IITs)',
      short_name: 'GATE NCB',
      slug: 'gate-ncb-india',
      official_website: 'https://gate2026.iisc.ac.in',
      description: 'Apex board administered on behalf of Department of Higher Education (MoE) by IISc Bangalore and seven zonal IITs conducting Graduate Aptitude Test in Engineering.',
      headquarters: 'IISc Bangalore / Zonal IITs, India',
      established_year: 1983,
      source_url: 'https://gate2026.iisc.ac.in'
    },
    {
      code: 'NLU_CONSORTIUM',
      name: 'Consortium of National Law Universities',
      short_name: 'Consortium of NLUs',
      slug: 'consortium-of-nlus',
      official_website: 'https://consortiumofnlus.ac.in',
      description: 'Permanent secretariat representing 24 National Law Universities in India conducting the Common Law Admission Test (CLAT).',
      headquarters: 'NLSIU Campus, Gnana Bharathi Main Road, Bengaluru, Karnataka, India',
      established_year: 2018,
      source_url: 'https://consortiumofnlus.ac.in'
    },
    {
      code: 'CBSE',
      name: 'Central Board of Secondary Education',
      short_name: 'CBSE',
      slug: 'cbse-india',
      official_website: 'https://ctet.nic.in',
      description: 'National board of education under Union Government of India, conducting Central Teacher Eligibility Test (CTET).',
      headquarters: 'Shiksha Kendra, 2, Community Centre, Preet Vihar, Delhi, India',
      established_year: 1929,
      source_url: 'https://ctet.nic.in'
    },
    {
      code: 'UGC',
      name: 'University Grants Commission',
      short_name: 'UGC',
      slug: 'ugc-india',
      official_website: 'https://ugcnet.nta.ac.in',
      description: 'Statutory organization established by the UGC Act 1956 responsible for coordination, determination, and maintenance of standards of higher education.',
      headquarters: 'Bahadur Shah Zafar Marg, New Delhi, India',
      established_year: 1956,
      source_url: 'https://ugcnet.nta.ac.in'
    },
    {
      code: 'NMC',
      name: 'National Medical Commission',
      short_name: 'NMC',
      slug: 'nmc-india',
      official_website: 'https://nmc.org.in',
      description: 'Statutory regulatory body established under NMC Act 2019 overseeing medical education, practice, and ethics in India.',
      headquarters: 'Pocket-14, Sector-8, Dwarka, New Delhi, India',
      established_year: 2020,
      source_url: 'https://nmc.org.in'
    }
  ];

  const authorityMap = {};
  for (const auth of authorities) {
    const res = await client.query(`
      INSERT INTO public.exam_authorities (
        country_id, code, name, short_name, slug, official_website, description, headquarters, established_year, source_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        short_name = EXCLUDED.short_name,
        official_website = EXCLUDED.official_website,
        description = EXCLUDED.description,
        headquarters = EXCLUDED.headquarters,
        source_url = EXCLUDED.source_url
      RETURNING id, code;
    `, [
      indiaId, auth.code, auth.name, auth.short_name, auth.slug, auth.official_website, auth.description, auth.headquarters, auth.established_year, auth.source_url
    ]);
    authorityMap[auth.code] = res.rows[0].id;
  }
  console.log('Seeded Authorities:', Object.keys(authorityMap).length);

  await client.end();
  process.exit(0);
}

seedIndiaBatch1().catch(e => { console.error(e); process.exit(1); });
