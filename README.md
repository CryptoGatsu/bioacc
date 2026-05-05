# bio/acc

## Overview

**bio/acc Fund V2** is a wallet-authenticated, community-driven platform for discovering, funding, and surfacing early-stage biotech startups.

It combines **Solana wallet identity**, **off-chain data integrity**, and **community-driven signal** to create a transparent system where:

> the best biotech ideas rise through conviction, not noise.

---

## Core Concept

* Users connect a Solana wallet
* Builders submit real biotech projects
* Community votes using token-based influence
* Manifesto aligns users under a shared vision
* Leaderboard ranks projects by conviction

---

## 🔥 What Changed in V2

V2 is a **major infrastructure upgrade**:

### ✅ Database Migration (CRITICAL)

* Moved from `submissions.json` → **Supabase**
* Real persistent backend
* No more GitHub rate limits
* Scalable data structure

---

### ✅ Manifesto System

Users can now **sign the bio/acc manifesto**:

* Wallet-signed participation
* Optional personal message
* Public signer list
* Social proof layer for the movement

> This turns bio/acc from a tool into a **movement**

---

### ✅ Stable Wallet System

* Persistent wallet connection
* Clean UI state handling
* No desync between frontend/backend
* Signature-based authentication across all actions

---

### ✅ Real-Time Stats Engine

Platform now tracks:

* Total projects
* Total votes
* Total manifesto signers
* User vote usage + cooldowns

All stats update dynamically and reliably.

---

### ✅ Submission System (Hardened)

Users can submit:

* Name
* GitHub (required)
* Social link (required)
* Website (optional)
* Description
* Logo (max 4MB)

#### Rules:

* Must be active (14+ days)
* Must have public GitHub
* Must have social presence

#### Restrictions:

* **1 project per wallet every 24h**
* Enforced at database level
* UI reflects cooldown in real time

---

### ✅ Voting System (Finalized)

* **1 vote = 1M tokens**
* Token-gated participation
* Signature required

#### Restrictions:

* Vote cooldown enforced
* Max votes per project
* Votes tracked per wallet

---

### ✅ Leaderboard (Stable)

* Projects ranked by votes
* Timestamp-based ordering
* Real-time updates
* First-mover visibility (submission time shown)

---

### ✅ Time System (Fixed)

* All timestamps converted to **user local time**
* Cooldowns display **live ticking countdown**
* No more mismatched durations (24h accurate)

---

### ✅ UI Consistency Upgrade

* Unified button styling (glow + font)
* Wallet-aware UI states
* Disabled actions when restricted
* Cleaner terminal-style design

---

## 🛡️ Security

* Wallet signature verification
* Timestamp validation (anti-replay)
* Database-enforced cooldowns
* No reliance on client-side trust

---

## 🧱 Tech Stack

### Frontend

* Vanilla HTML / CSS / JS
* Phantom Wallet integration

### Backend

* Vercel serverless API

### Database

* **Supabase (PostgreSQL)**

### Crypto

* tweetnacl
* bs58

---

## ⚙️ System Flow

### Submit

1. Connect wallet
2. Fill project form
3. Sign message
4. Backend verifies
5. Stored in Supabase
6. Cooldown activated

---

### Vote

1. Connect wallet
2. Enter votes
3. Sign message
4. Backend verifies
5. Votes applied
6. Cooldown activated

---

### Manifesto

1. Connect wallet
2. Sign manifesto
3. Optional note stored
4. Added to public signer list

---

## 📊 Data Model (Simplified)

Tables:

* `projects`
* `votes`
* `profiles`
* `manifesto`

---

## ⚠️ Current Limitations

* Off-chain voting (not yet on Solana)
* No project editing
* No advanced filtering/search yet
* No reputation scoring yet

---

## 🚀 V3 ROADMAP (NEXT PHASE)

This is where bio/acc becomes something much bigger.

---

### 🧠 1. Community-Curated Funding Layer

* Projects enter a **pre-funding phase**
* Community votes = signal
* Top projects unlock funding

---

### 💰 2. Capped Presales (25 SOL Model)

* Each project has:

  * Funding cap (ex: 25 SOL)
  * Participation window
* Fully community-driven allocation

---

### ⚡ 3. One-Click Token Deployment

After funding fills:

* Creator gets **Deploy Button**
* Auto-launch token
* Auto-distribute allocations
* Fee capture built-in

---

### 🎯 4. “Earn for Being Right”

* Early supporters rewarded
* Voting becomes **predictive signal**
* Incentivizes real research

---

### 🧬 5. Bio/Acc Signal Engine

Turn platform into:

> a live biotech intelligence feed

* Trending research detection
* Multi-source signal aggregation
* “🔥 trending topic” system expansion

---

### 🧑‍🚀 6. Reputation System

* Wallet-based scoring
* Accuracy over time
* Anti-sybil weighting

---

### 🌐 7. Full DAO Layer

* Proposal system
* Governance voting
* Staking-based influence

---

### 📈 8. Advanced Discovery

* Filters (new / trending / funded)
* Categories (AI bio, longevity, etc.)
* Search system

---

### 🔗 9. On-Chain Expansion

* Move key actions on-chain
* Token-integrated governance
* Trustless funding rails

---

## Vision

bio/acc is evolving into:

> A decentralized biotech discovery + funding engine

Where:

* builders get visibility early
* communities surface real innovation
* capital flows based on conviction

---

## Status

✅ V2 COMPLETE
✅ Supabase backend live
✅ Manifesto system live
✅ Voting + submission stable

🚧 V3 = Funding Layer + Tokenization

---

## Final Note

bio/acc is no longer just a voting app.

It is becoming:

> **a market for discovering and funding the future of biotech**
