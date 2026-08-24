import pg from 'pg';

const connStr = (process.env.POSTGRES_URL || '').split('?')[0];
const pool = new pg.Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

// 1. Strategic Country Entities
const STRATEGIC_COUNTRIES = [
  { iso2: 'DE', name: 'Germany' },
  { iso2: 'FR', name: 'France' },
  { iso2: 'AE', name: 'United Arab Emirates' },
  { iso2: 'JP', name: 'Japan' },
  { iso2: 'ZA', name: 'South Africa' },
];

const AUTHORITIES = [
  // Germany
  { code: 'IMPP', name: 'Institut für medizinische und pharmazeutische Prüfungsfragen', short_name: 'IMPP', iso2: 'DE', official_website: 'https://www.impp.de' },
  { code: 'LJPA_DE', name: 'Landesjustizprüfungsamt', short_name: 'LJPA', iso2: 'DE', official_website: 'https://www.justiz.bayern.de/landesjustizpruefungsamt/' },
  { code: 'TESTDAF', name: 'TestDaF-Institut / g.a.s.t.', short_name: 'TestDaF', iso2: 'DE', official_website: 'https://www.testdaf.de' },
  { code: 'GOETHE', name: 'Goethe-Institut', short_name: 'Goethe', iso2: 'DE', official_website: 'https://www.goethe.de' },
  { code: 'LAEK', name: 'Landesärztekammer', short_name: 'LÄK', iso2: 'DE', official_website: 'https://www.aerztekammer-bw.de' },

  // France
  { code: 'CNG_FR', name: 'Centre National de Gestion (CNG) / Ministère de la Santé', short_name: 'CNG Santé', iso2: 'FR', official_website: 'https://www.cng.sante.fr' },
  { code: 'CNB_FR', name: 'Conseil National des Barreaux', short_name: 'CNB', iso2: 'FR', official_website: 'https://www.cnb.avocat.fr' },
  { code: 'FEI_FR', name: 'France Éducation international', short_name: 'FEI', iso2: 'FR', official_website: 'https://www.france-education-international.fr' },
  { code: 'MESR_FR', name: "Ministère de l'Enseignement supérieur et de la Recherche", short_name: 'MESR', iso2: 'FR', official_website: 'https://www.enseignementsup-recherche.gouv.fr' },
  { code: 'MEN_FR', name: "Ministère de l'Éducation Nationale", short_name: 'MEN', iso2: 'FR', official_website: 'https://www.devenirenseignant.gouv.fr' },

  // UAE
  { code: 'DHA', name: 'Dubai Health Authority', short_name: 'DHA', iso2: 'AE', official_website: 'https://www.dha.gov.ae' },
  { code: 'DOH_AE', name: 'Department of Health Abu Dhabi', short_name: 'DOH Abu Dhabi', iso2: 'AE', official_website: 'https://www.doh.gov.ae' },
  { code: 'MOHAP', name: 'Ministry of Health and Prevention UAE', short_name: 'MOHAP', iso2: 'AE', official_website: 'https://mohap.gov.ae' },
  { code: 'MOE_AE', name: 'Ministry of Education UAE', short_name: 'MOE UAE', iso2: 'AE', official_website: 'https://emsat.moe.gov.ae' },

  // Japan
  { code: 'MHLW_JP', name: 'Ministry of Health, Labour and Welfare (厚生労働省)', short_name: 'MHLW Japan', iso2: 'JP', official_website: 'https://www.mhlw.go.jp' },
  { code: 'JF_JEES', name: 'Japan Foundation / JEES', short_name: 'JLPT / JEES', iso2: 'JP', official_website: 'https://www.jlpt.jp' },
  { code: 'NCUEE', name: 'National Center for University Entrance Examinations (大学入試センター)', short_name: 'NCUEE', iso2: 'JP', official_website: 'https://www.dnc.ac.jp' },

  // South Africa
  { code: 'HPCSA', name: 'Health Professions Council of South Africa', short_name: 'HPCSA', iso2: 'ZA', official_website: 'https://www.hpcsa.co.za' },
  { code: 'CMSA', name: 'Colleges of Medicine of South Africa', short_name: 'CMSA', iso2: 'ZA', official_website: 'https://www.cmsa.co.za' },
  { code: 'SAICA', name: 'South African Institute of Chartered Accountants', short_name: 'SAICA', iso2: 'ZA', official_website: 'https://www.saica.org.za' },
  { code: 'LPC_ZA', name: 'Legal Practice Council South Africa', short_name: 'LPC', iso2: 'ZA', official_website: 'https://lpc.org.za' },
  { code: 'SANC', name: 'South African Nursing Council', short_name: 'SANC', iso2: 'ZA', official_website: 'https://www.sanc.co.za' },
];

const EXAMS_DATA = [
  // --- GERMANY ---
  {
    iso2: 'DE',
    authority_code: 'IMPP',
    name: 'M1 Staatsexamen Medizin (Erster Abschnitt der Ärztlichen Prüfung)',
    slug: 'm1-staatsexamen-medizin-germany',
    short_name: 'M1 Physikum',
    description: 'National first medical licensing examination in Germany covering foundational pre-clinical medical sciences and human biology.',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Written CBT + Oral',
    duration: '2 Days (4 Hours / Day)',
    question_count: 320,
    official_url: 'https://www.impp.de/pruefungen/medizin/erster-abschnitt-der-aerztlichen-pruefung.html',
    stages: ['Schriftliche Prüfung (320 MCQ)', 'Mündlich-praktische Prüfung'],
    papers: ['Tag 1: Physik, Chemie, Biologie, Anatomie', 'Tag 2: Physiologie, Biochemie, Med. Psychologie'],
    subjects: [
      { name: 'Anatomie & Histologie', topics: ['Makroskopische Anatomie', 'Mikroskopische Anatomie (Histologie)', 'Neuroanatomie', 'Embryologie'] },
      { name: 'Physiologie', topics: ['Kardiophysiologie', 'Neurophysiologie', 'Renale Physiologie', 'Endokrine Physiologie'] },
      { name: 'Biochemie & Molekularbiologie', topics: ['Stoffwechselbiochemie', 'Enzymatik', 'Genetik & Molekularbiologie', 'Signaltransduktion'] },
      { name: 'Medizinische Psychologie & Soziologie', topics: ['Arzt-Patient-Beziehung', 'Kognitive Prozesse', 'Stress- & Bewältigungsforschung', 'Sozialmedizin'] },
    ]
  },
  {
    iso2: 'DE',
    authority_code: 'IMPP',
    name: 'M2 Staatsexamen Medizin (Zweiter Abschnitt - Hammerexamen)',
    slug: 'm2-staatsexamen-medizin-germany',
    short_name: 'M2 Hammerexamen',
    description: 'National second clinical medical licensing examination evaluating clinical sciences, pathology, and patient management in Germany.',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Computer-Based Test (3 Days)',
    duration: '3 Days (5 Hours / Day)',
    question_count: 320,
    official_url: 'https://www.impp.de/pruefungen/medizin/zweiter-abschnitt-der-aerztlichen-pruefung.html',
    stages: ['3-tägige schriftliche Fallprüfung (320 MCQ)'],
    papers: ['Tag 1: Innere Medizin & Pharmakologie', 'Tag 2: Chirurgie & Pädiatrie', 'Tag 3: Gynäkologie, Neurologie & Fächerübergreifend'],
    subjects: [
      { name: 'Innere Medizin', topics: ['Kardiologie', 'Gastroenterologie', 'Pneumologie', 'Nephrologie & Infektiologie'] },
      { name: 'Chirurgie', topics: ['Viszeralchirurgie', 'Unfallchirurgie & Orthopädie', 'Gefäßchirurgie', 'Anästhesie & Intensivmedizin'] },
      { name: 'Pädiatrie & Neonatologie', topics: ['Pädiatrische Infektiologie', 'Entwicklungsstörungen', 'Angeborene Herzfehler', 'Pädiatrische Onkologie'] },
      { name: 'Pharmakologie & Toxikologie', topics: ['Antihypertensiva', 'Antibiotikatherapie', 'Schmerztherapie & Analgetika', 'Psychopharmaka'] },
    ]
  },
  {
    iso2: 'DE',
    authority_code: 'LJPA_DE',
    name: 'Erstes Juristisches Staatsexamen',
    slug: 'erstes-juristisches-staatsexamen-germany',
    short_name: '1. Juristisches Staatsexamen',
    description: 'First national legal examination in Germany required for legal academic completion and entry into legal clerkship (Referendariat).',
    exam_type: 'Licensing',
    level: 'State/National',
    mode: 'Written Essay + Oral Examination',
    duration: '5 Days Written (5 Hours / Essay)',
    question_count: 6,
    official_url: 'https://www.justiz.bayern.de/landesjustizpruefungsamt/',
    stages: ['State Written Essay Exams (6 Klausuren)', 'University Specialization Exam (Schwerpunktbereich)', 'Oral State Exam'],
    papers: ['Zivilrecht Klausur I & II', 'Strafrecht Klausur', 'Öffentliches Recht Klausur I & II'],
    subjects: [
      { name: 'Zivilrecht (BGB)', topics: ['Allgemeiner Teil & Schuldrecht', 'Sachenrecht', 'Bereicherungsrecht & Deliktsrecht', 'Familien- & Erbrecht'] },
      { name: 'Strafrecht', topics: ['Strafrecht Allgemeiner Teil', 'Vermögensdelikte', 'Delikte gegen die Person', 'Strafprozessrecht (StPO)'] },
      { name: 'Öffentliches Recht', topics: ['Staats- & Verfassungsrecht', 'Allgemeines Verwaltungsrecht', 'Baurecht & Kommunalrecht', 'Polizei- & Sicherheitsrecht'] },
    ]
  },
  {
    iso2: 'DE',
    authority_code: 'TESTDAF',
    name: 'TestDaF (Test Deutsch als Fremdsprache)',
    slug: 'testdaf-deutsch-germany',
    short_name: 'TestDaF',
    description: 'Standardized German language proficiency test for international applicants seeking admission to German universities.',
    exam_type: 'Language Proficiency',
    level: 'International',
    mode: 'Computer-Based Test / Paper-Based',
    duration: '3 Hours 15 Minutes',
    question_count: 80,
    official_url: 'https://www.testdaf.de',
    stages: ['Leseverstehen', 'Hörverstehen', 'Schriftlicher Ausdruck', 'Mündlicher Ausdruck'],
    papers: ['TestDaF Complete Session'],
    subjects: [
      { name: 'Leseverstehen', topics: ['Wissenschaftsjournalistische Texte', 'Hochschulbezogene Lesetexte', 'Grafik- & Tabellenauswertung'] },
      { name: 'Hörverstehen', topics: ['Vorlesungen & Experteninterviews', 'Campus-Dialoge', 'Wissenschaftliche Vorträge'] },
      { name: 'Schriftlicher & Mündlicher Ausdruck', topics: ['Grafikbeschreibung & Stellungnahme', 'Argumentation im akademischen Kontext', 'Mündliche Kurzvorträge'] },
    ]
  },
  {
    iso2: 'DE',
    authority_code: 'LAEK',
    name: 'Fachsprachprüfung Medizin (FSP)',
    slug: 'fachsprachpruefung-medizin-fsp-germany',
    short_name: 'FSP Medizin',
    description: 'Medical German language competency examination required for international doctors applying for German medical licensure (Approbation).',
    exam_type: 'Licensing',
    level: 'State/Regional',
    mode: 'Simulated Patient Simulation',
    duration: '60 Minutes (3x20 Mins)',
    question_count: 3,
    official_url: 'https://www.aerztekammer-bw.de',
    stages: ['Station 1: Arzt-Patienten-Gespräch (Anamnese)', 'Station 2: Schriftliche Dokumentation (Arztbrief)', 'Station 3: Arzt-Arzt-Gespräch (Übergabe)'],
    papers: ['FSP Practical Simulation'],
    subjects: [
      { name: 'Anamnese & Patientenkommunikation', topics: ['Symptom- & Schmerzanamnese', 'Empathische Patientenerklärung', 'Aufklärungsgespräche'] },
      { name: 'Medizinische Dokumentation (Arztbrief)', topics: ['Epidokumentation & Befunderstellung', 'Arztbriefschreibung', 'Pharmakologische Empfehlungen'] },
      { name: 'Klinische Übergabe (Arzt-Arzt)', topics: ['Fallpräsentation (SBAR-Schema)', 'Fachterminologie & Synonyme', 'Therapie- & Diagnoseabsprache'] },
    ]
  },

  // --- FRANCE ---
  {
    iso2: 'FR',
    authority_code: 'CNG_FR',
    name: 'Épreuves Dématérialisées Nationales (EDN - Ex-ECNi)',
    slug: 'edn-epreuves-dematerialisees-nationales-france',
    short_name: 'EDN France',
    description: 'National standardized digital medical residency ranking examination in France for medical students.',
    exam_type: 'Residency / Licensing',
    level: 'National',
    mode: 'Tablet Digital Examination (EDN)',
    duration: '3 Days',
    question_count: 300,
    official_url: 'https://www.cng.sante.fr/concours-examens/epreuves-dematerialisees-nationales-edn',
    stages: ['Épreuves de Connaissances (KFP & QCM)', 'Examens Cliniques Objectifs Structurés (ECOS)'],
    papers: ['Jour 1: Dossiers Progressifs', 'Jour 2: Questions Isolées', 'Jour 3: Lecture Critique d\'Article (LCA)'],
    subjects: [
      { name: 'Médecine Interne & Pathologies', topics: ['Cardiologie & Vasculaire', 'Pneumologie', 'Gastro-Entérologie', 'Nephrologie & Endocrinologie'] },
      { name: 'Chirurgie & Urgences', topics: ['Chirurgie Viscérale', 'Orthopédie & Traumatologie', 'Anesthésie-Réanimation', 'Médecine d\'Urgence'] },
      { name: 'Pédiatrie & Gynécologie', topics: ['Pédiatrie Générale & Néonatologie', 'Gynécologie-Obstétrique', 'Santé de la Mère et de l\'Enfant'] },
      { name: 'Santé Publique & Médecine Légale', topics: ['Épidémiologie & Biostatistiques', 'Éthique Médicale & Déontologie', 'Droit de la Santé'] },
    ]
  },
  {
    iso2: 'FR',
    authority_code: 'CNB_FR',
    name: "Examen d'Accès au CRFPA (Barreau Français)",
    slug: 'crfpa-examen-barreau-france',
    short_name: 'CRFPA Barreau',
    description: 'National examination for entry into regional bar training centers (CRFPA) for lawyer qualification in France.',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Written Essays + Grand Oral',
    duration: '4 Written Exams + Oral',
    question_count: 5,
    official_url: 'https://www.cnb.avocat.fr',
    stages: ['Épreuves Écrites d\'Admissibilité', 'Grand Oral d\'Admission (Libertés Fondamentales)'],
    papers: ['Note de Synthèse', 'Droit des Obligations', 'Épreuve Spécialité Pratique', 'Procédure'],
    subjects: [
      { name: 'Droit des Obligations & Civil', topics: ['Responsabilité Civile', 'Droit des Contrats', 'Régime Général de l\'Obligation', 'Preuves & Sûretés'] },
      { name: 'Procédure Civil & Pénal', topics: ['Procédure Civile', 'Procédure Pénale', 'Procédure Administrative', 'Voies d\'Exécution'] },
      { name: 'Libertés Fondamentales & Droit Européen', topics: ['Droits de l\'Homme & CEDH', 'Droits Fondamentaux Constitutionnels', 'Droit de l\'Union Européenne'] },
    ]
  },
  {
    iso2: 'FR',
    authority_code: 'FEI_FR',
    name: 'DALF C1 (Diplôme d\'Études en Langue Française)',
    slug: 'dalf-c1-langue-francaise-france',
    short_name: 'DALF C1',
    description: 'Official advanced French language certification awarded by the French Ministry of Education.',
    exam_type: 'Language Proficiency',
    level: 'International',
    mode: 'Written & Oral Examination',
    duration: '4 Hours',
    question_count: 4,
    official_url: 'https://www.france-education-international.fr/diplome/dalf',
    stages: ['Épreuves Collectives (Compréhension & Production Écrite)', 'Épreuve Individuelle (Production Orale)'],
    papers: ['DALF C1 Exam Session'],
    subjects: [
      { name: 'Compréhension Orale & Écrite', topics: ['Analyse de Documents Académiques', 'Synthèse de Textes Scientifiques', 'Écoute de Conférences'] },
      { name: 'Production Écrite & Orale', topics: ['Essai Argumentatif', 'Synthèse de Dossier', 'Exposé Oral & Débat Structuré'] },
    ]
  },
  {
    iso2: 'FR',
    authority_code: 'MESR_FR',
    name: 'PASS / L.AS (Parcours Accès Santé)',
    slug: 'pass-las-acces-sante-france',
    short_name: 'PASS / L.AS',
    description: 'First-year medical health science selection entry pathway for medical, dental, pharmacy, and midwifery studies in France.',
    exam_type: 'University Entrance',
    level: 'National',
    mode: 'Written QCM + Oral',
    duration: '2 Semesters',
    question_count: 200,
    official_url: 'https://www.enseignementsup-recherche.gouv.fr',
    stages: ['Épreuves Écrites Majeure Santé (QCM)', 'Épreuves Orales de Sélection'],
    papers: ['Semestre 1 QCM', 'Semestre 2 QCM & Oral'],
    subjects: [
      { name: 'Sciences Biologiques & Médicales', topics: ['Anatomie Humaine', 'Biologie Cellulaire & Biochimie', 'Physiologie Générale', 'Biophysique'] },
      { name: 'Pharmacologie & Humanités', topics: ['Pharmacologie & Chimie du Médicament', 'Humanités Médicales & Éthique', 'Biostatistiques'] },
    ]
  },

  // --- UNITED ARAB EMIRATES ---
  {
    iso2: 'AE',
    authority_code: 'DHA',
    name: 'DHA General Practitioner Licensing Exam',
    slug: 'dha-medical-license-exam-uae',
    short_name: 'DHA GP Exam',
    description: 'Medical licensing examination conducted by Dubai Health Authority for General Practitioners practicing in Dubai.',
    exam_type: 'Licensing',
    level: 'Emirate / National',
    mode: 'Computer-Based Test (Prometric)',
    duration: '3 Hours',
    question_count: 150,
    official_url: 'https://www.dha.gov.ae',
    stages: ['Single CBT Examination (150 MCQs)'],
    papers: ['DHA GP Prometric Paper'],
    subjects: [
      { name: 'Internal Medicine', topics: ['Cardiovascular Disorders', 'Endocrinology & Diabetes', 'Gastroenterology', 'Respiratory Medicine'] },
      { name: 'General Surgery & Emergency', topics: ['Acute Abdomen', 'Trauma & Wound Care', 'Surgical Infections', 'Shock Management'] },
      { name: 'Pediatrics & Obstetrics', topics: ['Pediatric Immunization & Growth', 'Common Childhood Infections', 'Antenatal Care', 'Obstetric Emergencies'] },
      { name: 'Public Health & Ethics', topics: ['DHA Healthcare Regulations', 'Infection Control Protocols', 'Patient Safety & Medical Ethics'] },
    ]
  },
  {
    iso2: 'AE',
    authority_code: 'DOH_AE',
    name: 'DOH Abu Dhabi (HAAD) Medical Practitioner Exam',
    slug: 'doh-haad-medical-license-uae',
    short_name: 'DOH HAAD Exam',
    description: 'Department of Health Abu Dhabi medical licensure examination for healthcare professionals practicing in the Emirate of Abu Dhabi.',
    exam_type: 'Licensing',
    level: 'Emirate / National',
    mode: 'Computer-Based Test (Pearson VUE)',
    duration: '3 Hours',
    question_count: 150,
    official_url: 'https://www.doh.gov.ae',
    stages: ['Single CBT Examination (150 MCQs)'],
    papers: ['DOH Abu Dhabi Exam Paper'],
    subjects: [
      { name: 'Clinical Medicine', topics: ['Cardiology', 'Pulmonology', 'Nephrology', 'Dermatology & Rheumatology'] },
      { name: 'Primary & Preventive Care', topics: ['Chronic Disease Prevention', 'Family Medicine Guidelines', 'Screening Protocols'] },
      { name: 'Healthcare Safety & Law', topics: ['DOH Abu Dhabi Quality Standards', 'Pharmacovigilance', 'Medical Negligence & Ethics'] },
    ]
  },
  {
    iso2: 'AE',
    authority_code: 'MOHAP',
    name: 'MOHAP Physician & Specialist Licensing Examination',
    slug: 'mohap-gp-licensing-exam-uae',
    short_name: 'MOHAP Exam',
    description: 'Federal Ministry of Health & Prevention licensing examination for medical practitioners across the Northern Emirates of UAE.',
    exam_type: 'Licensing',
    level: 'Federal / National',
    mode: 'Computer-Based Test',
    duration: '3 Hours',
    question_count: 150,
    official_url: 'https://mohap.gov.ae',
    stages: ['Single CBT Examination'],
    papers: ['MOHAP Licensure Paper'],
    subjects: [
      { name: 'General Practice & Internal Medicine', topics: ['Cardiovascular Medicine', 'Gastrointestinal Diseases', 'Metabolic Disorders'] },
      { name: 'Pediatrics & Maternal Health', topics: ['Child Development & Nutrition', 'Maternal Mortality Prevention', 'Gynecological Care'] },
      { name: 'MOHAP Regulations & Ethics', topics: ['UAE Federal Health Laws', 'Controlled Substances Rules', 'Infection Prevention'] },
    ]
  },
  {
    iso2: 'AE',
    authority_code: 'DHA',
    name: 'DHA Registered Nurse Licensing Exam',
    slug: 'dha-registered-nurse-exam-uae',
    short_name: 'DHA Nurse Exam',
    description: 'Licensing examination administered by Dubai Health Authority for qualified registered nurses practicing in Dubai.',
    exam_type: 'Licensing',
    level: 'Emirate / National',
    mode: 'Computer-Based Test (Prometric)',
    duration: '3 Hours',
    question_count: 150,
    official_url: 'https://www.dha.gov.ae',
    stages: ['Single CBT Examination (150 MCQs)'],
    papers: ['DHA RN Prometric Paper'],
    subjects: [
      { name: 'Fundamentals of Nursing & Safety', topics: ['Aseptic Technique & Infection Control', 'Medication Administration', 'Patient Assessment & Triage'] },
      { name: 'Medical-Surgical Nursing', topics: ['Pre- & Post-Operative Care', 'Critical Care Nursing', 'Cardiovascular & Respiratory Nursing'] },
      { name: 'Pediatric & Maternal Nursing', topics: ['Labor & Delivery Nursing', 'Neonatal Intensive Care', 'Pediatric Patient Safety'] },
    ]
  },
  {
    iso2: 'AE',
    authority_code: 'MOE_AE',
    name: 'EmSAT Achieve (Emirates Standardized Test)',
    slug: 'emsat-achieve-uae',
    short_name: 'EmSAT Achieve',
    description: 'National UAE standardized test evaluating university readiness across core academic disciplines.',
    exam_type: 'Standardized Admissions',
    level: 'National',
    mode: 'Computer-Based Adaptive Test',
    duration: '4 Hours',
    question_count: 120,
    official_url: 'https://emsat.moe.gov.ae',
    stages: ['Computer-Based Adaptive Sections'],
    papers: ['EmSAT English', 'EmSAT Mathematics', 'EmSAT Physics/Chemistry'],
    subjects: [
      { name: 'EmSAT English', topics: ['Grammar & Vocabulary', 'Reading Comprehension', 'Extended Essay Writing'] },
      { name: 'EmSAT Mathematics', topics: ['Algebra & Functions', 'Geometry & Trigonometry', 'Calculus & Statistics'] },
      { name: 'EmSAT Physics', topics: ['Mechanics & Motion', 'Electricity & Magnetism', 'Waves & Optics', 'Modern Physics'] },
    ]
  },

  // --- JAPAN ---
  {
    iso2: 'JP',
    authority_code: 'MHLW_JP',
    name: 'Japanese Medical Licensing Examination (医師国家試験 - Ishi Kokka Shiken)',
    slug: 'japanese-medical-licensing-examination-japan',
    short_name: 'Ishi Kokka Shiken',
    description: 'National Japanese medical board licensing examination required for all medical graduates to practice medicine in Japan.',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Written Paper / CBT (2 Days)',
    duration: '2 Days (4 Hours / Day)',
    question_count: 400,
    official_url: 'https://www.mhlw.go.jp',
    stages: ['A, B, C Sections (Day 1)', 'D, E, F Sections (Day 2)'],
    papers: ['必修問題 (Mandatory Questions)', '一般問題 (General Clinical Questions)', '臨床実習問題 (Clinical Practice Scenarios)'],
    subjects: [
      { name: 'Mandatory Essential Medicine (必修問題)', topics: ['Emergency Resuscitation & Basic Life Support', 'Medical Ethics & Patient Rights', 'Medical Law & Public Health Regulations'] },
      { name: 'General Clinical Medicine (一般問題)', topics: ['Cardiovascular System', 'Gastrointestinal & Hepatic System', 'Respiratory System', 'Endocrinology & Metabolism'] },
      { name: 'Specialty Clinical Scenarios (臨床問題)', topics: ['Pediatrics & Neonatology', 'Obstetrics & Gynecology', 'Psychiatry & Neurology', 'Anesthesiology & Critical Care'] },
    ]
  },
  {
    iso2: 'JP',
    authority_code: 'JF_JEES',
    name: 'JLPT N1 / N2 (Japanese-Language Proficiency Test - 日本語能力試験)',
    slug: 'jlpt-n1-n2-japanese-language-test-japan',
    short_name: 'JLPT N1/N2',
    description: 'Official Japanese language proficiency qualification for non-native speakers recognized worldwide by universities and employers in Japan.',
    exam_type: 'Language Proficiency',
    level: 'International',
    mode: 'Paper-Based Multiple Choice',
    duration: '170 Minutes (N1)',
    question_count: 105,
    official_url: 'https://www.jlpt.jp',
    stages: ['Section 1: Language Knowledge & Reading', 'Section 2: Listening'],
    papers: ['Language Knowledge (Kanji/Vocab/Grammar) & Reading', 'Listening Comprehension'],
    subjects: [
      { name: 'Language Knowledge (言語知識)', topics: ['Advanced Kanji (漢字)', 'Advanced Vocabulary (語彙)', 'Grammar Patterns (文法)'] },
      { name: 'Reading Comprehension (読解)', topics: ['Short Text Analysis', 'Medium/Long Expository Articles', 'Information Retrieval & Comparison'] },
      { name: 'Listening Comprehension (聴解)', topics: ['Task-Based Comprehension', 'Key Point Comprehension', 'Quick Response & Unrehearsed Dialogue'] },
    ]
  },
  {
    iso2: 'JP',
    authority_code: 'NCUEE',
    name: 'Common Test for University Admissions (大学入学共通テスト - Kyotsu Test)',
    slug: 'common-test-university-admissions-kyotsu-test-japan',
    short_name: 'Kyotsu Test',
    description: 'National Japanese standardized entrance examination administered to high school graduates for national and public university admissions.',
    exam_type: 'University Entrance',
    level: 'National',
    mode: 'Multiple-Choice Mark Sheet',
    duration: '2 Days',
    question_count: 250,
    official_url: 'https://www.dnc.ac.jp',
    stages: ['Day 1: Geography/History, Civics, Japanese, Foreign Language', 'Day 2: Science, Mathematics'],
    papers: ['Japanese Language Paper', 'Mathematics I & II Papers', 'Foreign Language (English) Paper'],
    subjects: [
      { name: 'Japanese Language (国語)', topics: ['Modern Japanese Prose (現代文)', 'Classical Japanese (古文)', 'Classical Chinese (漢文)'] },
      { name: 'Mathematics (数学)', topics: ['Math I & A (Algebra & Geometry)', 'Math II & B (Calculus & Vectors)'] },
      { name: 'English (外国語 - 英語)', topics: ['English Reading Comprehension', 'English Listening Comprehension'] },
    ]
  },

  // --- SOUTH AFRICA ---
  {
    iso2: 'ZA',
    authority_code: 'HPCSA',
    name: 'HPCSA Medical Board Examination',
    slug: 'hpcsa-medical-board-exam-south-africa',
    short_name: 'HPCSA Board Exam',
    description: 'Health Professions Council of South Africa licensing examination required for foreign-trained medical graduates seeking registration.',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Written MCQ + Clinical OSCE',
    duration: 'Written 1 Day + OSCE 1 Day',
    question_count: 200,
    official_url: 'https://www.hpcsa.co.za',
    stages: ['Part 1: Written Theory Examination (200 MCQ)', 'Part 2: Clinical OSCE Examination'],
    papers: ['HPCSA Written Paper 1', 'HPCSA Written Paper 2'],
    subjects: [
      { name: 'Internal Medicine & Therapeutics', topics: ['Infectious Diseases (HIV/TB Management)', 'Cardiovascular Diseases', 'Respiratory & Pulmonology', 'Endocrinology'] },
      { name: 'General Surgery & Orthopedics', topics: ['Surgical Emergencies & Trauma Care', 'Acute Abdomen Management', 'Burn Injuries', 'Surgical Infections'] },
      { name: 'Paediatrics & Child Health', topics: ['Malnutrition & Growth Monitoring', 'Paediatric Infectious Diseases', 'Neonatal Resuscitation', 'Paediatric Emergencies'] },
      { name: 'Obstetrics & Gynaecology', topics: ['Antenatal & Intrapartum Care', 'Hypertensive Disorders of Pregnancy', 'Gynecological Pathology', 'Obstetric Emergencies'] },
    ]
  },
  {
    iso2: 'ZA',
    authority_code: 'SAICA',
    name: 'SAICA Initial Test of Competence (ITC)',
    slug: 'saica-itc-chartered-accountant-south-africa',
    short_name: 'SAICA ITC',
    description: 'First national qualifying examination administered by SAICA for candidates qualifying as Chartered Accountants (CA SA) in South Africa.',
    exam_type: 'Professional Qualification',
    level: 'National',
    mode: 'Written Case Study Exams',
    duration: '2 Days (2 Sessions / Day)',
    question_count: 4,
    official_url: 'https://www.saica.org.za',
    stages: ['4 Integrated Written Case Sessions over 2 Days'],
    papers: ['Session 1 & 2 (Day 1)', 'Session 3 & 4 (Day 2)'],
    subjects: [
      { name: 'Financial Accounting & Reporting (IFRS)', topics: ['IFRS Statements Presentation', 'Group Financial Statements & Consolidations', 'Revenue Recognition & Leases', 'Financial Instruments'] },
      { name: 'Management Decision Making & Governance', topics: ['Cost Accounting & Variance Analysis', 'Financial Management & Valuation', 'Corporate Strategy & Governance (King IV)'] },
      { name: 'Auditing, Assurance & Ethics', topics: ['ISA Audit Standards', 'Internal Controls & Risk Assessment', 'Auditor Ethics & Professional Responsibility'] },
      { name: 'Taxation (Income Tax Act)', topics: ['Corporate Income Tax', 'Value Added Tax (VAT)', 'Capital Gains Tax (CGT)', 'Individual Taxation'] },
    ]
  },
  {
    iso2: 'ZA',
    authority_code: 'LPC_ZA',
    name: 'Legal Practice Council Admission Examination (LPC Bar/Attorney Exam)',
    slug: 'lpc-attorneys-admission-exam-south-africa',
    short_name: 'LPC Admission Exam',
    description: 'National qualifying examination conducted by Legal Practice Council South Africa for admission as an Attorney of the High Court.',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Written Examination',
    duration: '2 Days (4 Papers)',
    question_count: 4,
    official_url: 'https://lpc.org.za',
    stages: ['4 Written Papers'],
    papers: ['Paper 1: High Court Practice', 'Paper 2: Magistrates Court Practice', 'Paper 3: Estates & Wills', 'Paper 4: Legal Ethics & Trust Accounting'],
    subjects: [
      { name: 'Civil Procedure & Court Practice', topics: ['High Court Rules & Litigation', 'Magistrates Court Act & Jurisdiction', 'Motion Court & Trial Practice', 'Appeals & Reviews'] },
      { name: 'Wills, Estates & Contracts', topics: ['Administration of Deceased Estates', 'Drafting of Wills & Trusts', 'Commercial Contracts & Property Law'] },
      { name: 'Legal Ethics & Trust Bookkeeping', topics: ['Attorneys Trust Account Rules', 'LPC Code of Conduct', 'Professional Negligence & Ethics'] },
    ]
  },
  {
    iso2: 'ZA',
    authority_code: 'SANC',
    name: 'SANC Professional Nurse Licensing Examination',
    slug: 'sanc-professional-nurse-licensing-exam-south-africa',
    short_name: 'SANC Licensing Exam',
    description: 'South African Nursing Council licensing examination required for registration as a Professional Nurse.',
    exam_type: 'Licensing',
    level: 'National',
    mode: 'Written Examination',
    duration: '3 Hours',
    question_count: 150,
    official_url: 'https://www.sanc.co.za',
    stages: ['Single Written Paper'],
    papers: ['SANC Nurse Licensure Paper'],
    subjects: [
      { name: 'Nursing Science & Ethos', topics: ['Nursing Ethics & Scope of Practice', 'Patient Assessment & Care Planning', 'Infection Prevention & Control'] },
      { name: 'Clinical Community Nursing', topics: ['Primary Health Care Guidelines', 'TB & HIV Management Protocols', 'Maternal & Infant Health Care'] },
    ]
  },
];

async function seedFast() {
  console.log('Fast seeding DE, FR, AE, JP, ZA catalogs via direct PG connection...');

  const countriesRes = await pool.query("SELECT id, iso2 FROM countries WHERE iso2 IN ('DE', 'FR', 'AE', 'JP', 'ZA')");
  const countryMap = {};
  countriesRes.rows.forEach(r => countryMap[r.iso2] = r.id);

  // Ingest Authorities
  for (const auth of AUTHORITIES) {
    const cid = countryMap[auth.iso2];
    if (!cid) continue;
    const slug = auth.short_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const exAuth = await pool.query("SELECT id FROM exam_authorities WHERE code = $1", [auth.code]);
    if (exAuth.rows.length === 0) {
      await pool.query(`
        INSERT INTO exam_authorities (country_id, name, code, short_name, slug, official_website, verification_status, source_url, last_verified_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'verified', $6, NOW())
      `, [cid, auth.name, auth.code, auth.short_name, slug, auth.official_website]);
    }
  }

  const authsRes = await pool.query("SELECT id, code FROM exam_authorities");
  const authMap = {};
  authsRes.rows.forEach(r => authMap[r.code] = r.id);

  // Ingest Exams
  for (const examData of EXAMS_DATA) {
    const cid = countryMap[examData.iso2];
    const aid = authMap[examData.authority_code] || null;
    if (!cid) continue;

    const langs = examData.iso2 === 'DE' ? ['German'] : examData.iso2 === 'FR' ? ['French'] : examData.iso2 === 'JP' ? ['Japanese'] : ['English'];

    let examId;
    const exExam = await pool.query("SELECT id FROM exams WHERE slug = $1", [examData.slug]);
    if (exExam.rows.length > 0) {
      examId = exExam.rows[0].id;
    } else {
      const insExam = await pool.query(`
        INSERT INTO exams (country_id, authority_id, name, slug, short_name, description, difficulty, question_count, time_limit_mins, is_featured, created_by_ai, status, official_url, source_url, exam_type, level, mode, duration, stages, papers, languages, current_version, version_year, is_current, verification_status, last_verified_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'Expert', $7, 180, true, false, 'active', $8, $8, $9, $10, $11, $12, $13, $14, $15, '2026', 2026, true, 'verified', NOW())
        RETURNING id
      `, [
        cid, aid, examData.name, examData.slug, examData.short_name, examData.description,
        examData.question_count, examData.official_url, examData.exam_type, examData.level,
        examData.mode, examData.duration, examData.stages, examData.papers, langs
      ]);
      examId = insExam.rows[0].id;

      // Version
      await pool.query(`
        INSERT INTO exam_versions (exam_id, version_year, is_current, stages, papers, pattern_summary, source_url, verified_at)
        VALUES ($1, 2026, true, $2, $3, $4, $5, NOW())
      `, [examId, examData.stages, examData.papers, `${examData.mode} - ${examData.duration}`, examData.official_url]);
    }

    // Subjects and Topics
    for (const subjData of examData.subjects) {
      const subjSlug = subjData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Master subject
      let masterSubjRes = await pool.query("SELECT id FROM subjects WHERE slug = $1 OR lower(name) = lower($2)", [subjSlug, subjData.name]);
      let masterSubjId;
      if (masterSubjRes.rows.length > 0) {
        masterSubjId = masterSubjRes.rows[0].id;
      } else {
        const insSubj = await pool.query("INSERT INTO subjects (name, slug, description) VALUES ($1, $2, $3) RETURNING id", [subjData.name, subjSlug, `${subjData.name} domain`]);
        masterSubjId = insSubj.rows[0].id;
      }

      // Exam subject
      let examSubjRes = await pool.query("SELECT id FROM exam_subjects WHERE exam_id = $1 AND subject_id = $2", [examId, masterSubjId]);
      let examSubjId;
      if (examSubjRes.rows.length > 0) {
        examSubjId = examSubjRes.rows[0].id;
      } else {
        const insExamSubj = await pool.query(`
          INSERT INTO exam_subjects (exam_id, subject_id, name, official_name, display_name, description, required, active, verification_status, source_url, last_verified_at)
          VALUES ($1, $2, $3, $3, $3, $4, true, true, 'verified', $5, NOW())
          RETURNING id
        `, [examId, masterSubjId, subjData.name, `${subjData.name} for ${examData.short_name}`, examData.official_url]);
        examSubjId = insExamSubj.rows[0].id;
      }

      // Topics
      for (const topicName of subjData.topics) {
        const topicSlug = topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        let masterTopicRes = await pool.query("SELECT id FROM topics WHERE subject_id = $1 AND (slug = $2 OR lower(name) = lower($3))", [masterSubjId, topicSlug, topicName]);
        let masterTopicId;
        if (masterTopicRes.rows.length > 0) {
          masterTopicId = masterTopicRes.rows[0].id;
        } else {
          const insTopic = await pool.query("INSERT INTO topics (subject_id, name, slug, description) VALUES ($1, $2, $3, $4) RETURNING id", [masterSubjId, topicName, topicSlug, `${topicName} topic`]);
          masterTopicId = insTopic.rows[0].id;
        }

        let exExamTopic = await pool.query("SELECT id FROM exam_topics WHERE subject_id = $1 AND topic_id = $2", [examSubjId, masterTopicId]);
        if (exExamTopic.rows.length === 0) {
          await pool.query(`
            INSERT INTO exam_topics (subject_id, topic_id, name, official_name, display_name, importance, active, verification_status, source_url, last_verified_at)
            VALUES ($1, $2, $3, $3, $3, 'High', true, 'verified', $4, NOW())
          `, [examSubjId, masterTopicId, topicName, examData.official_url]);
        }
      }
    }
    console.log(`Seeded Exam: ${examData.name} (${examData.iso2})`);
  }

  await pool.end();
  console.log('SUCCESSFULLY SEEDED ALL STRATEGIC STARTER CATALOGS!');
}

seedFast().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
