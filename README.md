# bio/acc

## Overview

**bio/acc Fund** is a wallet-authenticated, community-driven platform for discovering, submitting, and voting on early-stage biotech startups.

It combines Web3 identity (wallet signatures) with a lightweight off-chain backend to create a transparent, spam-resistant funding leaderboard.

---

## Core Concept

* Users connect a Solana wallet
* Projects are submitted publicly
* The community votes using token-gated influence
* The leaderboard ranks projects based on votes

The system is designed to prioritize:

* real builders
* active projects
* community-backed ideas

---

## Key Features

### 🔐 Wallet Authentication

* Users must connect a wallet (Phantom)
* All actions require a signed message
* Prevents spoofing and fake submissions

---

### 🚀 Project Submission

Users can submit a project with:

* Name
* GitHub repository (required)
* Social link (required)
* Website (optional)
* Description
* Logo

#### Rules:

* Must have a public GitHub
* Must be worked on for at least 14 days
* Must have a social presence

#### Restrictions:

* 1 submission per wallet every 24 hours
* Signature verification required

---

### 🗳️ Voting System

* Votes are tied to token holdings
* **1 vote = 1,000,000 tokens**
* Users input how many votes to allocate

#### Restrictions:

* 1 voting session per wallet every 24 hours
* Must hold at least 1M tokens to vote
* Signature required before vote is processed

---

### 📊 Leaderboard

* Projects ranked by total votes
* Top 3 highlighted visually
* Pagination for scalability
* Fully dynamic and auto-updating

---

### 🧠 Persistent Backend State

All critical data is stored in `submissions.json`:

* Projects
* Votes
* Submission timestamps
* Vote cooldowns
* Vote tracking per wallet

This ensures:

* votes persist after refresh
* cooldowns cannot be bypassed
* UI reflects real system state

---

### 🆔 Permanent Project IDs

Each project is assigned a unique ID:

* prevents vote mismatches
* ensures leaderboard stability
* allows future scalability

---

### ⏱️ Cooldown System

#### Voting:

* 24-hour cooldown per wallet
* UI shows remaining time
* Vote button locks after use

#### Submissions:

* 24-hour cooldown per wallet
* Prevents spam project entries

---

### 🛡️ Anti-Spam + Security

* Wallet signature verification (tweetnacl)
* Replay attack protection (timestamp validation)
* Backend enforcement of all rules
* No reliance on localStorage

---

## Tech Stack

### Frontend

* Vanilla HTML / CSS / JS
* Phantom Wallet integration

### Backend

* Vercel serverless function (`update.js`)
* GitHub API for persistent storage

### Storage

* `submissions.json` (acts as database)

### Crypto

* `tweetnacl` for signature verification
* `bs58` for public key decoding

---

## How It Works (Flow)

### Submit

1. User connects wallet
2. Fills form
3. Signs message
4. Backend verifies signature
5. Project stored in JSON

---

### Vote

1. User connects wallet
2. Enters vote amount
3. System checks token balance
4. User signs message
5. Backend verifies + applies vote
6. Cooldown activated

---

## Current Limitations

* No on-chain voting (off-chain system)
* GitHub used as database (rate limits possible)
* No project editing after submission
* No multi-vote scaling tied directly to wallet balance yet

---

## Future Improvements

* Token-weighted automatic voting
* On-chain governance integration
* Project detail pages
* User profile / activity dashboard
* Anti-sybil wallet scoring
* Batch vote processing (performance scaling)

---

## Vision

bio/acc Fund aims to become:

> A decentralized discovery engine for early biotech innovation

Where:

* builders gain visibility
* communities curate quality
* capital follows conviction

---

## Status

✅ MVP Complete
✅ Fully functional voting system
✅ Persistent backend
🚧 Scaling + UX improvements next

---

## Final Note

This is not just a website — it’s a **foundation for a decentralized startup ecosystem**.


## 🚧 Planned V2 Features

The next phase of **bio/acc Fund** focuses on transforming the platform from a voting tool into a **community-driven ecosystem** for biotech innovation.

---

### 👤 User Profiles

Introduce wallet-based user profiles to build identity and reputation across the platform.

**Features:**

* View connected wallet profile
* Track submitted projects
* Track voting history
* Total votes cast
* Join date

**Goal:**
Create accountability and reward consistent contributors.

---

### 💬 Project Comment Sections

Enable discussion under each project to encourage community engagement and deeper evaluation.

**Features:**

* Wallet-authenticated comments
* Timestamped messages
* Per-project comment threads
* Basic anti-spam protections (cooldowns + length limits)

**Goal:**
Turn passive voters into active participants.

---

### 📄 Project Detail Pages

Each project will have its own dedicated page for a more in-depth view.

**Features:**

* Full project information
* External links (GitHub, social, website)
* Vote count and ranking
* Comment section
* Activity history

**Goal:**
Improve discovery, readability, and engagement.

---

### 🧠 Enhanced Backend Structure

Expand the current JSON-based system to support new data types and scale more effectively.

**Additions:**

* `users` (profile data)
* `comments` (per project)
* Improved indexing using project IDs

**Goal:**
Prepare the system for growth without breaking existing functionality.

---

### 🛡️ Improved Anti-Spam & Trust Systems

Strengthen protections against abuse and low-quality participation.

**Planned Enhancements:**

* Comment cooldowns
* Submission validation improvements
* Optional reputation scoring (based on activity quality)

**Goal:**
Maintain high signal-to-noise ratio across the platform.

---

### 📊 User Activity Dashboard

Allow users to easily view their activity in one place.

**Features:**

* Projects submitted
* Votes cast
* Current cooldown timers
* Recent interactions

**Goal:**
Increase transparency and user engagement.

---

### 🔮 Future Considerations

Beyond V2, additional upgrades may include:

* Token-weighted voting
* Staking-based governance
* Project reputation scoring
* On-chain integration
* Leaderboards for top contributors

---

## Vision for V2

V2 shifts bio/acc Fund toward:

> A decentralized, community-curated platform for discovering and evaluating early-stage biotech projects.

Where:

* builders showcase real work
* users contribute meaningful feedback
* community consensus drives visibility

---
