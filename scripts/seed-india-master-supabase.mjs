import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log('--- Seeding Master Subjects and Topics via Supabase REST API ---');

  // 1. Fetch India ID
  const { data: countries } = await supabase.from('countries').select('id, iso2').eq('iso2', 'IN');
  const indiaId = countries?.[0]?.id;
  if (!indiaId) throw new Error('India country not found');

  // 2. Fetch Categories
  const { data: categories } = await supabase.from('exam_categories').select('id, slug');
  const categoryMap = {};
  categories.forEach(c => { categoryMap[c.slug] = c.id; });

  // 3. Fetch Authorities
  const { data: authorities } = await supabase.from('exam_authorities').select('id, code');
  const authorityMap = {};
  authorities.forEach(a => { authorityMap[a.code] = a.id; });

  // 4. Upsert Master Subjects
  const masterSubjects = [
    { name: 'Anatomy', slug: 'anatomy', cat: 'medical-healthcare', desc: 'Gross human anatomy, embryology, histology, neuroanatomy, and anatomical clinical correlations.', aliases: ['Human Anatomy', 'Gross Anatomy', 'Clinical Anatomy'] },
    { name: 'Physiology', slug: 'physiology', cat: 'medical-healthcare', desc: 'Cellular, systemic, organ systems physiology, biophysics, and physiological clinical correlations.', aliases: ['Human Physiology', 'Medical Physiology'] },
    { name: 'Biochemistry', slug: 'biochemistry', cat: 'medical-healthcare', desc: 'Enzymology, metabolic pathways, molecular genetics, endocrinology, clinical biochemistry, and inborn errors.', aliases: ['Medical Biochemistry', 'Clinical Biochemistry'] },
    { name: 'Pharmacology', slug: 'pharmacology', cat: 'medical-healthcare', desc: 'Pharmacokinetics, pharmacodynamics, clinical therapeutics, chemotherapy, toxicology, and drug interactions.', aliases: ['Clinical Pharmacology', 'Medical Pharmacology'] },
    { name: 'Pathology', slug: 'pathology', cat: 'medical-healthcare', desc: 'General pathology, hematopathology, systemic organ pathology, immunopathology, and diagnostic microscopy.', aliases: ['General Pathology', 'Systemic Pathology'] },
    { name: 'Microbiology', slug: 'microbiology', cat: 'medical-healthcare', desc: 'Bacteriology, virology, mycology, parasitology, immunology, and hospital infection control.', aliases: ['Medical Microbiology', 'Clinical Microbiology'] },
    { name: 'Forensic Medicine & Toxicology', slug: 'forensic-medicine-toxicology', cat: 'medical-healthcare', desc: 'Forensic pathology, medical jurisprudence, autopsy techniques, clinical toxicology, and medical legal aspects.', aliases: ['FMT', 'Forensic Medicine', 'Medical Jurisprudence'] },
    { name: 'Community Medicine & PSM', slug: 'community-medicine-psm', cat: 'medical-healthcare', desc: 'Epidemiology, biostatistics, public health administration, communicable diseases, demography, and national health programs.', aliases: ['PSM', 'Preventive and Social Medicine', 'Public Health'] },
    { name: 'General Medicine', slug: 'general-medicine', cat: 'medical-healthcare', desc: 'Cardiology, pulmonology, gastroenterology, nephrology, neurology, rheumatology, hematology, infectious diseases, and intensive care.', aliases: ['Internal Medicine', 'Medicine'] },
    { name: 'General Surgery', slug: 'general-surgery', cat: 'medical-healthcare', desc: 'Trauma, surgical oncology, gastrointestinal surgery, vascular surgery, urology, wound healing, and perioperative management.', aliases: ['Surgery', 'Clinical Surgery'] },
    { name: 'Obstetrics & Gynaecology', slug: 'obstetrics-gynaecology', cat: 'medical-healthcare', desc: 'Antenatal care, intrapartum monitoring, high-risk pregnancy, benign/malignant gynecological disorders, reproductive endocrinology, and infertility.', aliases: ['OBG', 'OB-GYN', 'Obstetrics and Gynecology'] },
    { name: 'Pediatrics', slug: 'pediatrics', cat: 'medical-healthcare', desc: 'Growth and development, neonatology, pediatric infectious diseases, pediatric emergencies, nutrition, and pediatric systemic disorders.', aliases: ['Paediatrics', 'Child Health'] },
    { name: 'Orthopedics', slug: 'orthopedics', cat: 'medical-healthcare', desc: 'Fractures and dislocations, orthopedic oncology, pediatric orthopedics, arthroscopy, joint reconstruction, and spinal disorders.', aliases: ['Orthopaedics', 'Orthopedic Surgery'] },
    { name: 'Ophthalmology', slug: 'ophthalmology', cat: 'medical-healthcare', desc: 'Cornea, cataract, glaucoma, retina, uveitis, neuro-ophthalmology, refractive errors, and ophthalmic surgical interventions.', aliases: ['Eye Diseases', 'Clinical Ophthalmology'] },
    { name: 'Otorhinolaryngology (ENT)', slug: 'otorhinolaryngology-ent', cat: 'medical-healthcare', desc: 'Diseases of the ear, hearing loss, nasal and paranasal sinus pathology, pharynx, larynx, and head/neck surgery.', aliases: ['ENT', 'Otolaryngology', 'Ear Nose Throat'] },
    { name: 'Dermatology & Venereology', slug: 'dermatology-venereology', cat: 'medical-healthcare', desc: 'Clinical dermatology, papulosquamous disorders, blistering diseases, sexually transmitted infections, leprosy, and cutaneous manifestations of systemic disease.', aliases: ['Dermatology', 'DVL', 'Skin & VD'] },
    { name: 'Psychiatry', slug: 'psychiatry', cat: 'medical-healthcare', desc: 'Mood disorders, schizophrenia, anxiety and OCD, substance use disorders, psychopharmacology, cognitive disorders, and child psychiatry.', aliases: ['Behavioral Sciences', 'Clinical Psychiatry'] },
    { name: 'Radiology & Radiodiagnosis', slug: 'radiology-radiodiagnosis', cat: 'medical-healthcare', desc: 'Plain radiography, CT, MRI, ultrasonography, nuclear imaging, radiation physics, and interventional radiology.', aliases: ['Radiology', 'Radio-diagnosis', 'Medical Imaging'] },
    { name: 'Anesthesiology', slug: 'anesthesiology', cat: 'medical-healthcare', desc: 'General anesthesia, regional and neuraxial blocks, airway management, cardiopulmonary resuscitation (ACLS/BLS), pain medicine, and critical care monitoring.', aliases: ['Anaesthesiology', 'Anesthesia'] },

    // Dental
    { name: 'Prosthodontics & Crown Bridge', slug: 'prosthodontics', cat: 'dentistry', desc: 'Complete dentures, removable partial dentures, fixed partial prosthodontics, and dental implantology.', aliases: ['Prosthetic Dentistry'] },
    { name: 'Oral & Maxillofacial Surgery', slug: 'oral-maxillofacial-surgery', cat: 'dentistry', desc: 'Exodontia, impactions, maxillofacial trauma, orthognathic surgery, cysts, and oral pathologies.', aliases: ['Oral Surgery', 'OMFS'] },
    { name: 'Conservative Dentistry & Endodontics', slug: 'conservative-dentistry-endodontics', cat: 'dentistry', desc: 'Operative dentistry, root canal treatment, pulp biology, periapical pathologies, and aesthetic restorations.', aliases: ['Endodontics', 'Operative Dentistry'] },
    { name: 'Periodontology', slug: 'periodontology', cat: 'dentistry', desc: 'Periodontal anatomy, gingivitis, periodontitis, regenerative periodontal surgery, and implant mucositis.', aliases: ['Periodontics'] },
    { name: 'Orthodontics & Dentofacial Orthopedics', slug: 'orthodontics-dentofacial-orthopedics', cat: 'dentistry', desc: 'Malocclusions, cephalometrics, fixed and removable appliance mechanics, and growth modulation.', aliases: ['Orthodontics'] },

    // Civil Services & General Studies
    { name: 'Indian Polity & Governance', slug: 'indian-polity-governance', cat: 'civil-services-govt', desc: 'Constitution of India, political system, Panchayati Raj, public policy, rights issues, judiciary, and governance mechanisms.', aliases: ['Polity', 'Indian Constitution', 'Governance'] },
    { name: 'Indian History & National Movement', slug: 'indian-history-national-movement', cat: 'civil-services-govt', desc: 'Ancient India, Medieval India, Modern Indian History, Indian National Movement, freedom struggle, and post-independence consolidation.', aliases: ['History of India', 'Modern Indian History', 'Indian Freedom Struggle'] },
    { name: 'Indian & World Geography', slug: 'indian-world-geography', cat: 'civil-services-govt', desc: 'Physical, social, economic geography of India and the world, climatology, geomorphology, oceanography, and resource distribution.', aliases: ['Geography', 'Physical Geography', 'Indian Geography'] },
    { name: 'Economic & Social Development', slug: 'economic-social-development', cat: 'civil-services-govt', desc: 'Sustainable development, poverty, inclusion, demographics, fiscal and monetary policy, inflation, banking, and social sector initiatives.', aliases: ['Indian Economy', 'Economics', 'Macroeconomics'] },
    { name: 'Environmental Ecology & Biodiversity', slug: 'environmental-ecology-biodiversity', cat: 'civil-services-govt', desc: 'Ecology concepts, biodiversity conservation, climate change, international conventions, environmental degradation, and pollution control.', aliases: ['Environment & Ecology', 'Climate Change', 'Ecology'] },
    { name: 'General Science & Technology', slug: 'general-science-technology', cat: 'civil-services-govt', desc: 'Developments in scientific research, space missions (ISRO), defense technology, biotechnology, nanotechnology, IT, and everyday science.', aliases: ['Science & Tech', 'General Science', 'Scientific Research'] },
    { name: 'Current Events of National & International Importance', slug: 'current-affairs-national-international', cat: 'civil-services-govt', desc: 'National and international news, multilateral summits, treaties, government schemes, indices, awards, and geopolitical affairs.', aliases: ['Current Affairs', 'National & International Events'] },
    { name: 'CSAT Logical Reasoning & Analytical Ability', slug: 'csat-logical-reasoning', cat: 'civil-services-govt', desc: 'Syllogisms, blood relations, seating arrangements, coding-decoding, analytical puzzles, and critical reasoning.', aliases: ['Analytical Ability', 'Logical Reasoning CSAT'] },
    { name: 'CSAT Quantitative Aptitude & Data Interpretation', slug: 'csat-quantitative-aptitude', cat: 'civil-services-govt', desc: 'Number systems, arithmetic, percentages, ratios, time and work, permutations and combinations, probability, tables, and graphs.', aliases: ['Basic Numeracy CSAT', 'Quantitative Aptitude CSAT'] },
    { name: 'CSAT Reading Comprehension', slug: 'csat-reading-comprehension', cat: 'civil-services-govt', desc: 'Passage comprehension, inference extraction, author tone, main themes, and English reading evaluation.', aliases: ['Comprehension CSAT', 'Reading Comprehension'] },

    // General Competencies (Banking, SSC, Government)
    { name: 'Quantitative Aptitude', slug: 'quantitative-aptitude', cat: 'banking-financial-services', desc: 'Arithmetic, algebra, geometry, trigonometry, mensuration, profit & loss, simple & compound interest, speed & distance, and data analysis.', aliases: ['Maths', 'Numerical Ability', 'Quant'] },
    { name: 'Reasoning Ability', slug: 'reasoning-ability', cat: 'banking-financial-services', desc: 'Verbal and non-verbal reasoning, series, analogies, classification, direction sense, input-output machines, inequalities, and puzzles.', aliases: ['General Intelligence', 'Logical Reasoning', 'Reasoning'] },
    { name: 'English Language & Comprehension', slug: 'english-language-comprehension', cat: 'banking-financial-services', desc: 'Grammar rules, vocabulary, spot the error, sentence improvement, cloze test, reading comprehension, idioms and phrases, and synonyms/antonyms.', aliases: ['General English', 'English Comprehension', 'Verbal Ability'] },
    { name: 'General & Banking Awareness', slug: 'general-banking-awareness', cat: 'banking-financial-services', desc: 'Banking terms, RBI guidelines, monetary policy, financial markets, union budget, economic survey, static GK, and national events.', aliases: ['Banking Awareness', 'Financial Awareness', 'General Awareness'] },
    { name: 'Computer Knowledge & Aptitude', slug: 'computer-knowledge-aptitude', cat: 'engineering-tech', desc: 'Computer fundamentals, hardware, software, operating systems, internet protocols, DBMS basics, cybersecurity, and MS Office.', aliases: ['Computer Awareness', 'Computer Aptitude'] },
    { name: 'Data Analysis & Interpretation', slug: 'data-analysis-interpretation', cat: 'banking-financial-services', desc: 'Bar graphs, pie charts, radar graphs, caselets, line charts, tabular DI, missing DI, and data sufficiency.', aliases: ['DI & Data Analysis', 'Data Interpretation'] },

    // Management (CAT)
    { name: 'Verbal Ability & Reading Comprehension (VARC)', slug: 'varc-management', cat: 'management-business', desc: 'Passage analysis, para-jumbles, para-summary, odd sentence out, critical inference, and contextual vocabulary.', aliases: ['VARC', 'CAT Verbal Ability'] },
    { name: 'Data Interpretation & Logical Reasoning (DILR)', slug: 'dilr-management', cat: 'management-business', desc: 'Matrix arrangements, truth and lie logic, scheduling, Venn diagrams, binary logic, games & tournaments, network routes, and complex reasoning grids.', aliases: ['DILR', 'CAT DILR'] },
    { name: 'Quantitative Ability (QA - Management)', slug: 'qa-management', cat: 'management-business', desc: 'Numbers, modern mathematics (P&C, probability), geometry, coordinate geometry, functions, logarithms, progressions, and advanced algebra.', aliases: ['QA CAT', 'CAT Quant'] },

    // Engineering & Sciences
    { name: 'Physics', slug: 'physics', cat: 'engineering-tech', desc: 'Kinematics, laws of motion, work energy power, rotational dynamics, gravitation, thermodynamics, electrostatics, current electricity, magnetism, optics, and modern physics.', aliases: ['General Physics', 'Engineering Physics', 'Class 11 & 12 Physics'] },
    { name: 'Chemistry', slug: 'chemistry', cat: 'science-research', desc: 'Physical chemistry (thermodynamics, equilibrium, kinetics, electrochemistry), Inorganic chemistry (periodic trends, coordination compounds), and Organic chemistry (mechanisms, functional groups, biomolecules).', aliases: ['General Chemistry', 'Chemical Sciences'] },
    { name: 'Mathematics', slug: 'mathematics', cat: 'engineering-tech', desc: 'Calculus (limits, continuity, differentiation, integration, differential equations), Algebra, Coordinate Geometry, Vectors & 3D, Trigonometry, Statistics & Probability.', aliases: ['Higher Mathematics', 'Engineering Mathematics'] },
    { name: 'Biology (Botany & Zoology)', slug: 'biology-botany-zoology', cat: 'medical-healthcare', desc: 'Diversity of living world, structural organization in animals and plants, cell structure & function, plant physiology, human physiology, reproduction, genetics & evolution, ecology & environment.', aliases: ['Biology', 'NEET Biology', 'Life Sciences'] },
    { name: 'Computer Science & Information Technology', slug: 'computer-science-it', cat: 'engineering-tech', desc: 'Algorithms, Data Structures, Theory of Computation, Compiler Design, Operating Systems, Database Management Systems, Computer Networks, and Computer Organization.', aliases: ['CSE', 'CS & IT', 'Computer Science Core'] },

    // Law (CLAT)
    { name: 'Legal Reasoning & Aptitude', slug: 'legal-reasoning-aptitude', cat: 'law-legal', desc: 'Constitutional law, law of torts, contract law, criminal law (BNS), international law, environmental jurisprudence, and legal reasoning comprehension passages.', aliases: ['Legal Aptitude', 'Legal Reasoning'] },

    // Education & Teaching
    { name: 'Child Development and Pedagogy', slug: 'child-development-pedagogy', cat: 'education-teaching', desc: 'Child growth, theories of Piaget, Vygotsky, Kohlberg, inclusive education, learning theories, child psychology, and assessment for learning.', aliases: ['CDP', 'Child Pedagogy', 'Teaching Methodology'] },
    { name: 'Teaching & Research Aptitude (General Paper)', slug: 'teaching-research-aptitude', cat: 'education-teaching', desc: 'Teaching aptitude, research methods, communication, ICT in education, higher education system governance, and people/environment interactions.', aliases: ['UGC NET Paper 1', 'General Teaching Aptitude'] }
  ];

  const subjectRows = masterSubjects.map(s => ({
    name: s.name,
    slug: s.slug,
    category_id: categoryMap[s.cat] || null,
    description: s.desc,
    aliases: s.aliases
  }));

  const { data: upsertedSubjs, error: sErr } = await supabase.from('subjects').upsert(subjectRows, { onConflict: 'slug' }).select('id, slug');
  if (sErr) throw sErr;
  console.log(`Upserted ${upsertedSubjs.length} Master Subjects.`);

  const subjectMap = {};
  upsertedSubjs.forEach(s => { subjectMap[s.slug] = s.id; });

  // 5. Upsert Master Topics
  const masterTopics = [
    // Anatomy
    { s: 'anatomy', name: 'General Anatomy & Embryological Principles', slug: 'general-anatomy-embryology', imp: 'High', desc: 'Gametogenesis, germ layers, brachial apparatus, pharyngeal arches, and anatomical terminology.' },
    { s: 'anatomy', name: 'Neuroanatomy & Cranial Nerves', slug: 'neuroanatomy-cranial-nerves', imp: 'Critical', desc: 'Brainstem internal anatomy, cerebral hemispheres, ventricles, circle of Willis, and cranial nerve nuclei tracks.' },
    { s: 'anatomy', name: 'Head and Neck Anatomy', slug: 'head-and-neck-anatomy', imp: 'High', desc: 'Triangles of neck, infratemporal fossa, orbit, parotid gland, larynx, pharynx, and fascial spaces.' },
    { s: 'anatomy', name: 'Thorax & Mediastinum', slug: 'thorax-mediastinum', imp: 'High', desc: 'Heart chambers, coronary circulation, lungs, bronchopulmonary segments, mediastinal divisions, and thoracic duct.' },
    { s: 'anatomy', name: 'Abdomen & Pelvis', slug: 'abdomen-pelvis', imp: 'Critical', desc: 'Peritoneal folds, epiploic foramen, portal venous system, retroperitoneum, inguinal canal, pelvic diaphragm, and perineum.' },
    { s: 'anatomy', name: 'Upper & Lower Limb Anatomy', slug: 'upper-lower-limb-anatomy', imp: 'High', desc: 'Brachial plexus, axilla, hand spaces, femoral triangle, popliteal fossa, foot arches, and joint mechanics.' },

    // Physiology
    { s: 'physiology', name: 'General & Cell Physiology', slug: 'general-cell-physiology', imp: 'High', desc: 'Membrane transport, resting membrane potential, action potential, and cellular second messenger pathways.' },
    { s: 'physiology', name: 'Cardiac Electrophysiology & Hemodynamics', slug: 'cardiac-electrophysiology-hemodynamics', imp: 'Critical', desc: 'Pacemaker potentials, cardiac cycle, ECG vector analysis, cardiac output regulation, and blood pressure control.' },
    { s: 'physiology', name: 'Respiratory Mechanics & Gas Transport', slug: 'respiratory-mechanics-gas-transport', imp: 'High', desc: 'Compliance, surfactant, ventilation-perfusion ratios, oxygen-hemoglobin dissociation curve, and neural/chemical regulation.' },
    { s: 'physiology', name: 'Renal Physiology & Fluid Acid-Base Balance', slug: 'renal-physiology-acid-base', imp: 'Critical', desc: 'Glomerular filtration, tubular transport mechanisms, countercurrent multiplier, RAAS axis, and acid-base disorders.' },
    { s: 'physiology', name: 'Neurophysiology & Motor/Sensory Systems', slug: 'neurophysiology-motor-sensory', imp: 'High', desc: 'Synaptic transmission, ascending sensory pathways, descending motor tracts, basal ganglia, and cerebellum functions.' },
    { s: 'physiology', name: 'Endocrine & Reproductive Physiology', slug: 'endocrine-reproductive-physiology', imp: 'Critical', desc: 'Pituitary, thyroid, adrenal, pancreatic hormones, calcium homeostasis, and menstrual cycle hormonal feedback.' },

    // Biochemistry
    { s: 'biochemistry', name: 'Carbohydrate Metabolism & Clinical Disorders', slug: 'carbohydrate-metabolism', imp: 'Critical', desc: 'Glycolysis, citric acid cycle, gluconeogenesis, glycogen storage disorders, and diabetes biochemistry.' },
    { s: 'biochemistry', name: 'Lipid Metabolism & Lipoprotein Pathologies', slug: 'lipid-metabolism', imp: 'Critical', desc: 'Beta-oxidation, fatty acid synthesis, ketone bodies, cholesterol biosynthesis, dyslipidemias, and atherosclerosis.' },
    { s: 'biochemistry', name: 'Protein, Amino Acid & Inborn Errors of Metabolism', slug: 'protein-amino-acid-metabolism', imp: 'Critical', desc: 'Urea cycle, PKU, MSUD, homocystinuria, alkaptonuria, and hemoglobinopathies.' },
    { s: 'biochemistry', name: 'Molecular Genetics & DNA/RNA Technologies', slug: 'molecular-genetics-dna-rna', imp: 'High', desc: 'Replication, transcription, translation, mutations, PCR, CRISPR, blotting techniques, and DNA repair.' },
    { s: 'biochemistry', name: 'Enzymology & Clinical Diagnostic Markers', slug: 'enzymology-diagnostic-markers', imp: 'High', desc: 'Michaelis-Menten kinetics, enzyme inhibition, coenzymes, and cardiac/hepatic isoenzyme profiles.' },

    // Pharmacology
    { s: 'pharmacology', name: 'General Pharmacology & Pharmacokinetics', slug: 'general-pharmacology-pharmacokinetics', imp: 'Critical', desc: 'First-order vs zero-order kinetics, bioavailability, volume of distribution, clearance, and receptor signaling mechanisms.' },
    { s: 'pharmacology', name: 'Autonomic Nervous System Drugs', slug: 'autonomic-nervous-system-drugs', imp: 'Critical', desc: 'Cholinergic agonists/antagonists, adrenergic agonists/blockers, and glaucoma pharmacotherapy.' },
    { s: 'pharmacology', name: 'Cardiovascular & Renal Drugs', slug: 'cardiovascular-renal-drugs', imp: 'Critical', desc: 'Antihypertensives, antiarrhythmics, heart failure therapeutics, antianginals, and diuretics.' },
    { s: 'pharmacology', name: 'Antimicrobial Agents & Chemotherapy', slug: 'antimicrobial-agents-chemotherapy', imp: 'Critical', desc: 'Beta-lactams, fluoroquinolones, macrolides, aminoglycosides, antitubercular regimens, and antivirals.' },
    { s: 'pharmacology', name: 'Central Nervous System Therapeutics', slug: 'central-nervous-system-therapeutics', imp: 'High', desc: 'Antiepileptics, antiparkinsonian drugs, antidepressants, antipsychotics, anxiolytics, and general anesthetics.' },

    // Pathology
    { s: 'pathology', name: 'Cell Injury, Inflammation & Repair', slug: 'cell-injury-inflammation-repair', imp: 'Critical', desc: 'Necrosis vs apoptosis, acute vs chronic inflammatory mediators, wound healing, and amyloidosis.' },
    { s: 'pathology', name: 'Neoplasia & Tumor Biology', slug: 'neoplasia-tumor-biology', imp: 'Critical', desc: 'Oncogenes, tumor suppressor genes (p53, Rb), hallmarks of cancer, paraneoplastic syndromes, and staging/grading.' },
    { s: 'pathology', name: 'Hematology & Coagulation Disorders', slug: 'hematology-coagulation-disorders', imp: 'Critical', desc: 'Nutritional anemias, hemolytic anemias, leukemias, lymphomas, myeloma, and bleeding disorders.' },
    { s: 'pathology', name: 'Cardiovascular & Respiratory Pathology', slug: 'cardiovascular-respiratory-pathology', imp: 'High', desc: 'Atherosclerosis, myocardial infarction, vasculitis, obstructive vs restrictive lung diseases, and pulmonary carcinomas.' },
    { s: 'pathology', name: 'Renal & Gastrointestinal Pathology', slug: 'renal-gastrointestinal-pathology', imp: 'High', desc: 'Glomerulonephritis, nephrotic syndrome, IBD, cirrhosis, hepatitis pathology, and colorectal neoplasia.' },

    // Polity
    { s: 'indian-polity-governance', name: 'Constitutional Framework & Fundamental Rights', slug: 'constitutional-framework-fundamental-rights', imp: 'Critical', desc: 'Preamble, Fundamental Rights (Articles 12-35), Directive Principles (DPSP), Fundamental Duties, and Basic Structure Doctrine.' },
    { s: 'indian-polity-governance', name: 'Union & State Executive and Legislature', slug: 'union-state-executive-legislature', imp: 'Critical', desc: 'President, Prime Minister, Governor, Parliament procedures, Money Bills, State Legislatures, and Federal Relations.' },
    { s: 'indian-polity-governance', name: 'Judiciary & Dispute Redressal Mechanisms', slug: 'judiciary-dispute-redressal', imp: 'High', desc: 'Supreme Court, High Courts, Judicial Review, Public Interest Litigation (PIL), Tribunals, and Subordinate Courts.' },
    { s: 'indian-polity-governance', name: 'Local Self-Government & Panchayati Raj', slug: 'local-self-government-panchayati-raj', imp: 'High', desc: '73rd and 74th Constitutional Amendments, devolution of powers, urban local bodies, and PESA Act.' },
    { s: 'indian-polity-governance', name: 'Constitutional & Statutory Bodies', slug: 'constitutional-statutory-bodies', imp: 'High', desc: 'Election Commission of India, UPSC, CAG, Finance Commission, NITI Aayog, NHRC, and Lokpal.' },

    // History
    { s: 'indian-history-national-movement', name: 'Ancient Indian Civilizations & Cultural Heritage', slug: 'ancient-india-culture', imp: 'High', desc: 'Indus Valley Civilization, Vedic period, Buddhism and Jainism, Mauryan Empire, Gupta Golden Age, and temple architecture.' },
    { s: 'indian-history-national-movement', name: 'Medieval India & Indo-Islamic Architecture', slug: 'medieval-india-architecture', imp: 'Medium', desc: 'Delhi Sultanate administrative systems, Vijayanagara Empire, Mughal administrative & agrarian reforms, Bhakti & Sufi movements.' },
    { s: 'indian-history-national-movement', name: 'British Expansion & Socio-Religious Reforms', slug: 'british-expansion-socio-religious-reforms', imp: 'High', desc: 'East India Company treaties, 1857 revolt causes and aftermath, Brahmo Samaj, Arya Samaj, and 19th-century awakening.' },
    { s: 'indian-history-national-movement', name: 'Indian National Movement (1885–1947)', slug: 'indian-national-movement-1885-1947', imp: 'Critical', desc: 'Moderate vs Extremist phases, Gandhian mass movements (NCM, CDM, Quit India), revolutionary activities, INA, and Indian Independence Act.' },

    // Economy
    { s: 'economic-social-development', name: 'National Income Accounting & Macroeconomic Trends', slug: 'national-income-macroeconomics', imp: 'High', desc: 'GDP, GNP, GVA calculations, growth vs development indices (HDI, MPI), and inflation indices (CPI, WPI).' },
    { s: 'economic-social-development', name: 'Monetary Policy & Indian Banking Sector', slug: 'monetary-policy-banking', imp: 'Critical', desc: 'RBI Monetary Policy Committee, Repo/Reverse Repo, CRR/SLR, NPA resolution (IBC), and digital payment ecosystems.' },
    { s: 'economic-social-development', name: 'Fiscal Policy, Public Finance & Union Budget', slug: 'fiscal-policy-public-finance', imp: 'Critical', desc: 'Fiscal deficit, revenue deficit, FRBM Act, GST framework, Direct Tax reforms, and Finance Commission transfers.' },
    { s: 'economic-social-development', name: 'Agriculture, Industrial Growth & Infrastructure', slug: 'agriculture-industry-infrastructure', imp: 'High', desc: 'MSP regimes, agri-marketing reforms, PLI schemes, National Infrastructure Pipeline, and logistic corridors.' },

    // Quant
    { s: 'quantitative-aptitude', name: 'Arithmetic & Commercial Mathematics', slug: 'arithmetic-commercial-maths', imp: 'Critical', desc: 'Percentages, Profit and Loss, Simple & Compound Interest, Ratio & Proportion, Partnerships, and Mixture & Alligation.' },
    { s: 'quantitative-aptitude', name: 'Time, Speed, Distance & Work', slug: 'time-speed-distance-work', imp: 'Critical', desc: 'Time and Work, Pipes and Cisterns, Trains, Boats & Streams, Races, and relative speed calculations.' },
    { s: 'quantitative-aptitude', name: 'Number System, HCF & LCM', slug: 'number-system-hcf-lcm', imp: 'High', desc: 'Divisibility rules, unit digit, remainder theorem, fractions, simplification, and indices/surds.' },
    { s: 'quantitative-aptitude', name: 'Algebra, Geometry & Mensuration', slug: 'algebra-geometry-mensuration', imp: 'High', desc: 'Linear and quadratic equations, circles, triangles, quadrilaterals, 2D and 3D surface area and volume.' },
    { s: 'quantitative-aptitude', name: 'Data Interpretation & Graphs', slug: 'data-interpretation-graphs', imp: 'Critical', desc: 'Bar graphs, Pie charts, Tabular matrices, Line graphs, and Mixed graphical problem sets.' },

    // Reasoning
    { s: 'reasoning-ability', name: 'Seating Arrangements & Complex Puzzles', slug: 'seating-arrangements-puzzles', imp: 'Critical', desc: 'Linear, circular, square seating arrangements, floor puzzles, day/month scheduling, and multi-variable ranking.' },
    { s: 'reasoning-ability', name: 'Syllogisms & Logical Deductions', slug: 'syllogisms-logical-deductions', imp: 'Critical', desc: 'Standard syllogisms, Only a few statements, reverse syllogisms, and validity checks.' },
    { s: 'reasoning-ability', name: 'Coding-Decoding, Direction & Blood Relations', slug: 'coding-direction-blood-relations', imp: 'High', desc: 'Pattern coding, coded blood relations, shortest distance path calculation, and compass directions.' },
    { s: 'reasoning-ability', name: 'Inequalities & Machine Input-Output', slug: 'inequalities-machine-input-output', imp: 'High', desc: 'Coded inequalities, algebraic statement inequalities, step-by-step sequential machine processing.' },

    // English
    { s: 'english-language-comprehension', name: 'Reading Comprehension & Critical Inferences', slug: 'reading-comprehension-inferences', imp: 'Critical', desc: 'Tone of author, passage central idea, vocabulary in context, and direct/indirect thematic questions.' },
    { s: 'english-language-comprehension', name: 'Grammar Error Spotting & Sentence Improvement', slug: 'grammar-error-spotting', imp: 'Critical', desc: 'Subject-verb agreement, tense consistency, modifiers, prepositional usage, and parallelism.' },
    { s: 'english-language-comprehension', name: 'Vocabulary, Idioms & Cloze Test Passages', slug: 'vocabulary-cloze-test', imp: 'High', desc: 'Fill in the blanks with appropriate prepositions/collocations, phrasal verbs, idioms, and paragraph completion.' },

    // Physics
    { s: 'physics', name: 'Mechanics & Newton Laws of Motion', slug: 'mechanics-newtons-laws', imp: 'Critical', desc: 'Kinematics in 1D & 2D, projectile motion, friction, circular motion, work-energy theorem, and center of mass.' },
    { s: 'physics', name: 'Electromagnetism & Current Electricity', slug: 'electromagnetism-current-electricity', imp: 'Critical', desc: 'Coulomb law, Gauss law, capacitance, Kirchhoff laws, magnetic force, Biot-Savart law, EMI, and AC circuits.' },
    { s: 'physics', name: 'Optics & Wave Physics', slug: 'optics-wave-physics', imp: 'High', desc: 'Ray optics, refraction through lenses & prisms, interference (YDSE), diffraction, and wave motion.' },
    { s: 'physics', name: 'Modern Physics & Quantum Phenomena', slug: 'modern-physics-quantum', imp: 'High', desc: 'Photoelectric effect, Bohr atom model, de Broglie wavelength, nuclear binding energy, and semiconductor diodes.' },

    // Chemistry
    { s: 'chemistry', name: 'Chemical Bonding & Molecular Structure', slug: 'chemical-bonding-molecular-structure', imp: 'Critical', desc: 'VSEPR theory, hybridization, molecular orbital theory (MOT), hydrogen bonding, and dipole moments.' },
    { s: 'chemistry', name: 'Thermodynamics & Chemical Equilibrium', slug: 'thermodynamics-equilibrium', imp: 'Critical', desc: 'First & second laws, enthalpy, entropy, Gibbs free energy, Le Chatelier principle, pH, and buffer solutions.' },
    { s: 'chemistry', name: 'Organic Reaction Mechanisms & Functional Groups', slug: 'organic-reaction-mechanisms', imp: 'Critical', desc: 'Electrophilic/nucleophilic substitutions (SN1/SN2), eliminations (E1/E2), named reactions, aldehydes, and amines.' },
    { s: 'chemistry', name: 'Coordination Chemistry & Transition Elements', slug: 'coordination-chemistry-d-f-block', imp: 'High', desc: 'Crystal field theory, IUPAC nomenclature of complexes, isomerism, and d-block catalytic properties.' },

    // Mathematics
    { s: 'mathematics', name: 'Differential & Integral Calculus', slug: 'differential-integral-calculus', imp: 'Critical', desc: 'Limits, continuity, differentiability, maxima-minima, definite integration properties, and differential equations.' },
    { s: 'mathematics', name: 'Coordinate Geometry & Conic Sections', slug: 'coordinate-geometry-conic-sections', imp: 'High', desc: 'Straight lines, pair of lines, circles, parabola, ellipse, and hyperbola standard forms and tangents.' },
    { s: 'mathematics', name: 'Vectors, 3D Geometry & Linear Algebra', slug: 'vectors-3d-linear-algebra', imp: 'Critical', desc: 'Dot/cross products, lines & planes in 3D, matrices, and determinants.' },
    { s: 'mathematics', name: 'Probability, Permutations & Combinations', slug: 'probability-permutations-combinations', imp: 'High', desc: 'Fundamental principle of counting, Bayes theorem, binomial distribution, and conditional probability.' },

    // CS
    { s: 'computer-science-it', name: 'Data Structures & Algorithms', slug: 'data-structures-algorithms', imp: 'Critical', desc: 'Asymptotic notation, searching & sorting, trees (BST, AVL, B-Trees), graphs (BFS, DFS, Dijkstra, Prim/Kruskal), and dynamic programming.' },
    { s: 'computer-science-it', name: 'Operating Systems & Concurrency', slug: 'operating-systems-concurrency', imp: 'Critical', desc: 'Processes, threads, CPU scheduling algorithms, synchronization (semaphores, mutex), deadlocks, and virtual memory paging.' },
    { s: 'computer-science-it', name: 'Database Management Systems (DBMS)', slug: 'dbms-core', imp: 'High', desc: 'Relational algebra, SQL queries, normalization (1NF to BCNF), transaction ACID properties, serializability, and indexing (B+ trees).' },
    { s: 'computer-science-it', name: 'Computer Networks & Network Security', slug: 'computer-networks-security', imp: 'High', desc: 'OSI/TCP-IP models, sliding window flow control, routing algorithms (OSPF, BGP), TCP congestion control, DNS, and RSA cryptography.' },

    // Law
    { s: 'legal-reasoning-aptitude', name: 'Constitutional Law & Fundamental Jurisprudence', slug: 'constitutional-law-jurisprudence', imp: 'Critical', desc: 'Writ jurisdictions, separation of powers, judicial appointments, rule of law, and landmark Supreme Court constitutional bench rulings.' },
    { s: 'legal-reasoning-aptitude', name: 'Law of Contracts & Commercial Transactions', slug: 'law-of-contracts', imp: 'High', desc: 'Offer, acceptance, consideration, capacity to contract, breach of contract, liquidated damages, and void agreements.' },
    { s: 'legal-reasoning-aptitude', name: 'Law of Torts & Consumer Protection', slug: 'law-of-torts-consumer-protection', imp: 'High', desc: 'Negligence, strict and absolute liability (Rylands v Fletcher / MC Mehta), defamation, nuisance, and Consumer Protection Act.' },
    { s: 'legal-reasoning-aptitude', name: 'Criminal Law & Bharatiya Nyaya Sanhita (BNS)', slug: 'criminal-law-bns', imp: 'Critical', desc: 'General exceptions, mens rea, offenses against human body (homicide, assault), offenses against property, and cybercrime.' },

    // Education
    { s: 'child-development-pedagogy', name: 'Theories of Child Development & Cognitive Learning', slug: 'theories-child-development-learning', imp: 'Critical', desc: 'Jean Piaget constructivism, Lev Vygotsky Zone of Proximal Development (ZPD), Lawrence Kohlberg moral stages, and Howard Gardner Multiple Intelligences.' },
    { s: 'child-development-pedagogy', name: 'Inclusive Education & Special Needs Children', slug: 'inclusive-education-special-needs', imp: 'Critical', desc: 'Addressing learners from diverse backgrounds, learning disabilities (dyslexia, dyscalculia), gifted children, and RPwD Act 2016 provisions.' }
  ];

  const topicRows = masterTopics
    .filter(t => subjectMap[t.s])
    .map(t => ({
      subject_id: subjectMap[t.s],
      name: t.name,
      slug: t.slug,
      description: t.desc,
      importance: t.imp
    }));

  const { data: upsertedTopics, error: tErr } = await supabase.from('topics').upsert(topicRows, { onConflict: 'subject_id,slug' }).select('id, subject_id, slug');
  if (tErr) throw tErr;
  console.log(`Upserted ${upsertedTopics.length} Master Topics.`);

  console.log('--- Master Subjects & Topics Step Completed ---');
}

run().catch(e => { console.error(e); process.exit(1); });
