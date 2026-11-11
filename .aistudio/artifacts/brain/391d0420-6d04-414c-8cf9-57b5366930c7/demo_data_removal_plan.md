# NeoMCQ Production Data Sanitization & Demo Removal Plan

## 1. Objective
Purge all mock student profiles, simulated payment transactions, test support tickets, mock ledger entries, and demo feedback payloads from the database while keeping the core live exam structures, country syllabi, subjects, and topics fully intact.

---

## 2. Target Tables for Demo Data Removal
The following tables containing mock or simulated test data will be truncated or cleaned:
1. `demo_student_profiles`: Remove all 547 synthetic student test profiles.
2. `credit_topup_orders`: Remove test/pending simulation top-up orders.
3. `payments`: Remove test/sandbox transactions and unverified mock payment records.
4. `credit_ledger`: Remove simulated credit top-up and test adjustment logs.
5. `support_tickets`: Remove test/mock customer support complaints and simulated tickets.
6. `ai_jobs`: Clear orphaned or test AI generation job logs.

---

## 3. Preserved Production Data
The following core production metadata tables will remain untouched:
- `exams`: Live exam blueprints (USMLE, NEET PG, FMGE, NCLEX, etc.).
- `exam_subjects`: Core medical and professional subject taxonomies.
- `exam_topics`: High-yield topic breakdowns.
- `subscription_plans`: Authoritative Pro ($9.99/mo), Max ($19.99/mo), and Elite ($499/yr) plan definitions.
- `profiles`: Genuine registered user accounts.
