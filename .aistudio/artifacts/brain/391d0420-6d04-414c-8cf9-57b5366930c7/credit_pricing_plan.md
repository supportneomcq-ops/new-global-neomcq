# NeoMCQ Revised Credit Allocation & 20% Net Profit Top-Up Architecture

## 1. Credit Allowances for Main Subscription Plans
Subscription plans include monthly credit allotments aligned with their subscription price to guarantee sustainable profit margins after covering Gemini 3.8 Flash API COGS.

| Plan | Monthly Price | Credit Allowance | Max COGS / Month | Net Profit Margin |
| :--- | :--- | :--- | :--- | :--- |
| **Pro** | $9.99 / mo | **500 Credits / mo** | ~$1.50 | **85% Net Profit** |
| **Max** | $19.99 / mo | **1,500 Credits / mo** | ~$4.50 | **77% Net Profit** |
| **Elite** | $499.00 / yr | **Unlimited Fair Use** | ~$20.00 / mo | **60% Net Profit** |

---

## 2. Strict 20% Net Profit Margin for Top-Ups ($4.00 User Value out of $5.00)
To ensure **exactly 20% profit remains with the website**, from every **$5.00 USD** top-up payment, **$1.00 USD (20%) is kept as platform profit**, and **$4.00 USD (80%) is converted into usable user credits**.

### Top-Up Packages (Subscribers Only):
- **$5.00 USD Top-Up**:
  - Platform Profit (20%): **$1.00**
  - User Credit Pool Value (80%): **$4.00**
  - **Credits Awarded**: **800 Credits** (at $0.005 per credit value).
- **$10.00 USD Top-Up**:
  - Platform Profit (20%): **$2.00**
  - User Credit Pool Value (80%): **$8.00**
  - **Credits Awarded**: **1,600 Credits** (at $0.005 per credit value).

---

## 3. Subscribers-Only Access Control
The credit top-up modal and checkout routes (`/api/billing/topup`) perform a strict server-side entitlement check:
1. Verifies that `getServerUserEntitlements(userId)` returns `isPaid: true` and an active plan (`PRO`, `MAX`, or `ELITE`).
2. Rejects any non-subscriber request with HTTP 403 (*"Credit top-ups are reserved exclusively for active subscribers"*).
