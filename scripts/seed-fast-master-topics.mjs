import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function seedMasterData() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL.');

    // 1. Fetch Categories
    const catRes = await client.query(`SELECT id, slug FROM exam_categories`);
    const categoryMap = {};
    catRes.rows.forEach(r => { categoryMap[r.slug] = r.id; });

    // 2. Fetch Subjects Map
    const subjRes = await client.query(`SELECT id, slug FROM subjects`);
    const subjectMap = {};
    subjRes.rows.forEach(r => { subjectMap[r.slug] = r.id; });

    // 3. Insert Canonical Topics in batch
    const canonicalTopics = [
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

    let inserted = 0;
    for (const t of canonicalTopics) {
      const parentSubjId = subjectMap[t.s];
      if (!parentSubjId) continue;
      await client.query(`
        INSERT INTO public.topics (subject_id, name, slug, description, importance)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (subject_id, slug) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          importance = EXCLUDED.importance;
      `, [parentSubjId, t.name, t.slug, t.desc, t.imp]);
      inserted++;
    }

    console.log(`Successfully processed ${inserted} canonical topics.`);
  } catch (err) {
    console.error('Error seeding master topics:', err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

seedMasterData();
