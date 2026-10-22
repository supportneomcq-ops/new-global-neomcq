# NeoMCQ Day-One Profitability & Cost Control Architecture

## 1. Financial Unit Economics & 20% Margin Guarantee
To guarantee a **minimum 20% net profit margin** from day one, every AI generation request is dynamically evaluated against real-time API cost calculation (COGS) stored in `ai_cost_events` and governed by the `ai_credit_ledger`.

### Cost Structure per Token (`gemini-3.8-flash` & `gpt-4o-mini`)
- **Input Tokens**: ~$0.50 per 1,000,000 tokens
- **Output Tokens**: ~$2.50 per 1,000,000 tokens
- **Average Full Topic Pack Generation** (40 MCQs, 2 Quizzes, A4 Notes, Flashcards, Sticky Notes, Active Recall, AI Tutor):
  - Tokens consumed: ~12,000 input / 8,000 output
  - **Raw API Cost (COGS)**: ~$0.006 + $0.020 = **$0.026 per full topic generation**

### Subscription Tier Profitability Matrix
| Tier | Price | Included Credits / Generations | Max Allowed COGS per Month | Guaranteed Profit Margin |
| :--- | :--- | :--- | :--- | :--- |
| **Pro** | $9.99 / mo | 500 Credits (~15 full topic gens) | $1.50 | **85% Net Profit** |
| **Max** | $19.99 / mo | 1,500 Credits (~45 full topic gens) | $4.50 | **77% Net Profit** |
| **Elite** | $499.00 / yr | Unlimited Fair Use (Capped at 200 gens/mo) | $20.00 / mo | **60% Net Profit** |

---

## 2. Community Caching (Zero-Cost Sharing)
As noted, when student #1 selects an exam topic (e.g. FMGE > Anatomy > Abdomen), the platform synthesizes and stores the complete study pack in `content_versions`.
- **When students #2 through #1000 open the exact same topic**:
  - The system serves the cached version from Supabase in **< 150ms**.
  - **API Cost (COGS) = $0.00**.
  - **Profit Margin = 100%** on cached reads while students enjoy lightning-fast performance.

---

## 3. Pay-As-You-Go Credit Top-Ups
For users who exhaust their monthly generation quotas or want on-demand custom AI generation:
- **Top-up Pack**: $4.99 for 300 Credits (covers ~10 full AI generation passes).
- **COGS**: ~$0.26.
- **Net Profit**: **$4.73 (~94% profit margin)**.

---

## 4. Enforcement Mechanism
1. **Quota Checker (`lib/entitlements/quota-checker.ts`)**: Evaluates user tier and credit balance before invoking AI generation.
2. **Cost Ledger (`ai_cost_events`)**: Logs exact input/output tokens and USD cost per generation.
3. **Admin Dashboard**: Real-time revenue, COGS, and profit margin monitoring.
