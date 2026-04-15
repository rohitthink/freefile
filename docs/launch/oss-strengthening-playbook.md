# Case Report: Strengthening the Claude for OSS Application

**Status:** Application submitted to Anthropic on 2026-04-15 06:42 UTC
**Review type:** Rolling — no fixed timeline
**Objective:** Maximize the probability of approval by building legitimate community traction before the reviewer visits the repo

---

## 1. Executive Summary

FreeFile ITR was submitted to the Claude for OSS program 40 minutes after being open-sourced. The application is technically complete but lacks the one signal that matters most to OSS program reviewers: **proof that real people use the project**. This report lays out a 14-day execution plan to fill that gap.

**The single most important metric:** GitHub stars from distinct, real users.

**Target by day 14:** 100+ stars, 3+ external contributors (not maintainer), 2+ merged awesome-X PRs, 500+ unique repo views, 1 feature on a publication.

**Effort required:** 1-2 hours per day for 14 days.

---

## 2. Current Baseline (Day 0 — 2026-04-15)

| Metric | Value | Target (Day 14) |
|---|---|---|
| GitHub stars | 0 | 100+ |
| Forks | 1 (from awesome-X fork) | 10+ |
| Watchers | 0 | 15+ |
| Unique repo views (last 14 days) | 4 | 500+ |
| Clones (unique, last 14 days) | 23 | 100+ |
| Open issues | 6 (5 seeded + 1) | 10+ with 3+ external |
| Closed issues | 0 | 3+ |
| External contributors | 0 | 3+ |
| Merged awesome-X PRs | 0 | 2+ |
| Commit streak | 1 day | 14 days |
| GitHub Discussions threads | 0 | 5+ |

**Honest read of the current state:** The project exists. Nothing else is true yet.

---

## 3. What Reviewers Actually Check

Based on publicly documented OSS program requirements from Anthropic, GitHub, JetBrains, and similar programs, a human reviewer will spend 5-15 minutes evaluating each application. In that time, they check:

### Tier 1 — Hard signals (biggest weight)

1. **Stars count and velocity.** Are people finding this organically? 100+ is meaningful. 1000+ is strong.
2. **External contributors.** Did anyone other than the maintainer commit? Even a single typo fix is proof of life.
3. **Commit recency and consistency.** Last commit in the last 7 days? Good. Gap of weeks? Red flag.
4. **License legitimacy.** OSI-approved? ✅ Already solved (AGPL-3.0).
5. **Real use case.** Does this solve a problem that matters, or is it yet another TODO app?

### Tier 2 — Quality signals

6. **README completeness.** Installation, usage, screenshots, contribution guide.
7. **CI status.** Green builds?
8. **Test coverage.** Even a basic test suite signals seriousness.
9. **Releases.** Tagged versions suggest a maintainer who thinks about users.
10. **Issue/PR hygiene.** Are issues labeled and responded to? Are PRs reviewed?

### Tier 3 — Soft signals

11. **External references.** Mentioned in articles, awesome lists, Hacker News, Reddit.
12. **Website or landing page.** Does the project have a home besides GitHub?
13. **Roadmap.** Is there a plan for v2?
14. **Community channels.** GitHub Discussions, Discord, mailing list.

### Our current standing

| Signal | Strength | Action needed |
|---|---|---|
| OSI license | Strong (AGPL-3.0) | None |
| README quality | Strong (screenshots, features, quick start) | None |
| Real use case | Strong (tax filing for 15M Indian freelancers) | None |
| CI | Strong (GitHub Actions matrix) | Ensure green |
| Issue templates, CoC, Security | Strong | None |
| **Stars** | **Zero** | **All of §5–§7** |
| **External contributors** | **Zero** | **§6** |
| **Commit velocity** | **Single burst** | **§4.4 daily commits** |
| External references | 5 PRs pending, 0 merged | §5.1 |
| Test coverage | Unknown | §4.5 |
| Releases | None | §4.2 |

---

## 4. Code & Repository Improvements (Week 1)

### 4.1 Create a v1.0.0 release tag (Day 1)

A tagged release is a credibility signal that costs 5 minutes and changes how the repo looks:

```bash
cd /Volumes/HomeX/rohitthink/Projects/IT/freefile
git tag -a v1.0.0 -m "v1.0.0 — first community release"
git push origin v1.0.0
gh release create v1.0.0 --title "v1.0.0 — First community release" \
  --notes "First tagged release after open-sourcing FreeFile ITR. Features: bank statement parsing for HDFC/SBI/ICICI/Axis/Kotak, ITR-3 and ITR-4 (44ADA) tax computation, old vs new regime comparison, automated filing on incometax.gov.in, Tauri desktop, Capacitor mobile."
```

**Impact:** Reviewers see "Latest release: v1.0.0" instead of "No releases yet."

### 4.2 Add a CHANGELOG.md (Day 1)

One file, 10 lines, big credibility. Use Keep a Changelog format.

### 4.3 Add status badges to README (Day 1)

- CI status badge (from GitHub Actions)
- Latest release badge
- Code size badge
- Last commit badge

These render inline in the README and signal "this is maintained" at a glance.

### 4.4 Daily commit streak (Days 1-14)

Reviewers notice gaps. Commit something small every single day. Options:

- Add a test case for an existing parser
- Refactor one function
- Fix one typo in a code comment
- Update dependencies
- Improve one error message

The target isn't quality — it's **commit frequency**. A 14-day green streak on the contribution graph is a signal.

**Automation:** You already have a scheduled task system. Consider a daily 9 AM prompt that asks "what small improvement can you ship today?"

### 4.5 Add test coverage badge (Day 3)

```bash
pip install pytest-cov
pytest --cov=backend --cov-report=html --cov-report=term
```

Add a Codecov badge to the README. Even 40% coverage looks better than no badge.

### 4.6 Write one new bank parser yourself (Days 3-5)

**This is the highest-leverage technical task.** Adding support for Bank of Baroda (the seed issue you already created) does three things at once:

1. Closes your first issue — signals responsiveness
2. Adds a real feature — users with that bank can now use the app
3. Creates a commit pattern that external contributors can copy

If you close issue #1 yourself with a real PR in 3 days, the repo tells a story: "Maintainer ships features rapidly."

---

## 5. Distribution & Social Proof (Week 1)

### 5.1 Nudge the awesome-X PRs toward merge

You have 5 open PRs. Each maintainer gets hundreds of PRs per year. Help them review yours:

**On each PR:**
- Comment after 48 hours if no response: "Happy to address any feedback — let me know if this needs changes."
- Link to the repo from the PR description
- If the maintainer has a PR format checklist, verify you followed it

**Merged PRs on awesome-X lists drive 10-50 stars each** depending on the list's popularity. awesome-tauri has 7k+ stars, so a merge there could drive 100+ organic stars.

### 5.2 Product Hunt launch (Day 4-5)

Product Hunt is the single best one-day traffic spike for a developer tool. Launch on a Tuesday or Wednesday at 00:01 PT.

**What you need:**
- 6 screenshots (already captured) ✅
- 30-60 second demo video (record with QuickTime + the demo DB workflow)
- First comment (already drafted in `docs/launch/producthunt.md`) ✅
- Hunter (optional — a PH user with karma > 500 who introduces your product)

**Realistic outcome:** Top 10 of the day = 500-2000 unique visitors, 20-80 stars.

### 5.3 Hacker News Show HN (Day 5-6)

HN is the highest-quality traffic source for developer tools. Show HN posts that get traction drive 1000-5000 unique visitors.

**Rules:**
- Post at 7-9 AM Pacific (optimal HN time)
- Title: `Show HN: FreeFile – Open-source ITR filing for Indian freelancers`
- Do NOT ask friends to upvote (against HN rules, will get flagged)
- Respond to every comment within 30 minutes for the first 4 hours
- The first comment should be technical — HN loves technical depth

**Realistic outcome (per similar Show HN posts):** 50-300 points, 30-150 stars.

### 5.4 Reddit (Day 6-7)

Three subreddits, each with a tailored post:

- **r/india** (~3M members): "I built a free open-source alternative to ClearTax for Indian freelancers" — emphasis on the Indian tax pain points
- **r/IndiaTax** (smaller but high-intent): Technical pitch about ITR-3/ITR-4 accuracy
- **r/opensource** (~200k): Privacy-first, local-first angle

**Rules:**
- Different title and body for each
- Don't crosspost (Reddit algorithms penalize it)
- Respond to every question
- Don't delete downvoted comments

**Realistic outcome:** 20-80 stars per successful post.

### 5.5 Twitter/X thread (Day 4, before PH)

Already drafted in `docs/launch/twitter.md`. Post it as a 10-tweet thread. Tag:
- Official Tauri (@tauri_apps)
- Guillermo Rauch (Vercel/Next.js)
- Anthropic (@AnthropicAI) — yes, this is meta but it's not shameful
- Top Indian tech Twitter accounts (Pratham Prasoon, Zerodha, etc.)

**Realistic outcome:** 5-30 stars if one tag retweets.

### 5.6 IndieHackers post (Day 6)

Already drafted. Post it to the "Launch" section. The audience is smaller but higher-quality — other founders who'll engage seriously.

### 5.7 LinkedIn post (Day 5)

Indian LinkedIn is massive and tax pain is universally felt. Target audience: freelance consultants, designers, developers.

**Template:**
```
Just open-sourced FreeFile ITR — a free, privacy-first income tax filing
app I built for Indian freelancers.

If you're tired of:
  • Paying ₹3-5k to a CA for a simple return
  • Ad-ridden "free" apps that want your PAN
  • Clunky official portals

Try it: github.com/rohitthink/freefile

Completely free. All your data stays on your device.
Open source under AGPL-3.0.

Looking for contributors — especially if you want to add support for
more banks or help with Hindi translation.
```

### 5.8 Dev.to article (Day 7)

Write a 1500-word technical post: "How I built a local-first tax filing app with Tauri, FastAPI, and SQLite."

Dev.to articles get indexed by Google and drive a long tail of traffic. Even a mediocre article pulls 200-500 views in the first month.

---

## 6. Community Building (Weeks 1-2)

### 6.1 Open GitHub Discussions on day 1

Create seed discussions so the Discussions tab doesn't look empty:

1. "Welcome! Introduce yourself" — a pinned thread
2. "What bank do you want supported next?" — gathers real requests
3. "Q&A: How does FreeFile handle ITR-3 vs ITR-4?" — pre-answered FAQ
4. "Roadmap discussion: v1.1 priorities" — community input

### 6.2 Respond to every issue within 24 hours

Even a "thanks for filing this, will look into it this weekend" counts. The GitHub UI shows first response time prominently.

### 6.3 Actively solicit bank parsers from the community

The bank parser is the single easiest contribution for someone who wants to use FreeFile but whose bank isn't supported. Create one new "good first issue" per week for a new bank:

- Week 1: Bank of Baroda (already created)
- Week 2: Canara Bank
- Week 3: Punjab National Bank
- Week 4: Yes Bank

Each issue with a detailed "how to write a parser" template will attract 1-2 contributors.

### 6.4 Accept the first 3 PRs aggressively

When someone sends your first external PR, your goal is **to merge it**, not to perfect it. Fix any showstoppers yourself after merge. A merged PR is a permanent credibility signal; an endlessly-reviewed PR drives contributors away.

### 6.5 Thank every contributor publicly

Add a `CONTRIBUTORS.md` or use the All Contributors bot. Name every contributor, even for typo fixes. Public recognition is the #1 motivator for OSS contributors.

---

## 7. Content Marketing (Weeks 1-2)

### 7.1 Write a launch blog post (Day 3)

Host it on dev.to, Hashnode, or your personal site. Topics:
- "Why I open-sourced my tax filing app"
- "Building a local-first tax engine in Python"
- "How FreeFile computes tax under both Indian regimes"

### 7.2 Record a demo video (Day 2)

Use the demo DB workflow you already have:
1. `python /tmp/create_demo_db.py`
2. Start servers
3. Navigate through the app
4. Screen-record for 60-90 seconds

Upload to YouTube, link from README and Product Hunt. Video is the highest-conversion asset for a tool.

### 7.3 Create social preview images (Day 2)

GitHub lets you set a social preview image (1280×640) that shows when the repo URL is shared. Use Figma/Canva to make:
- Hero image with "FreeFile ITR — Free, privacy-first tax filing"
- Link previews on Twitter, Slack, Discord become 10x more click-worthy

### 7.4 Reach out to Indian tech media (Day 7-10)

Soft pitches to:
- **Inc42** — Indian startup media, covers OSS
- **YourStory** — similar
- **IndianCompanies.in**
- **Analytics India Magazine** — tech-focused
- **Mint** (Livemint) — business angle: "developer's open-source alternative to commercial tax apps"

Pitch template:
```
Subject: Open-source, privacy-first tax filing app for Indian freelancers

Hi [Editor],

I'm a freelancer who just open-sourced FreeFile ITR — a local-first
income tax return app built specifically for India.

Why it might interest your readers:
• ~15M Indian freelancers pay ₹3-5k per return today
• Existing "free" apps sell user data
• FreeFile is free forever, stores nothing on servers, and is fully
  auditable (AGPL-3.0)
• Built with Tauri, FastAPI, Next.js

Happy to do an interview or provide screenshots. The repo is at
github.com/rohitthink/freefile.

Rohit
```

---

## 8. Metrics & Targets

### Day 7 targets (Week 1 end)
- 30+ stars
- 2+ merged awesome-X PRs
- 1+ external issue or PR
- Product Hunt launched
- HN Show HN posted
- Demo video recorded
- v1.0.0 released
- 7-day commit streak

### Day 14 targets (Week 2 end — when reviewer might check)
- 100+ stars
- 3+ merged awesome-X PRs
- 3+ external contributors
- 5+ external issues (not seeded by you)
- 500+ unique repo views
- Featured in 1 publication or newsletter
- 14-day commit streak
- v1.1.0 released (with 1-2 community bank parsers merged)

### Minimum acceptable threshold
If by Day 14 you have only 20-30 stars and no external contributors, the application is unlikely to be approved based on community traction. In that case, the next lever is **direct outreach to Anthropic** — add a follow-up comment to the application with your progress, or reach out on Twitter.

---

## 9. Risks & Anti-Patterns

**Do NOT:**

1. **Buy stars.** Fiverr sellers offer fake stars. They're detectable by reviewers (all from accounts with 0 other activity) and it's a bannable offense on GitHub.
2. **Ask friends to star in DMs.** Brigading looks identical to fake stars when reviewers check profiles.
3. **Post the same text on 10 subreddits.** Reddit suppresses crosspost-style content. Tailor each post.
4. **Delete negative comments.** On HN or Reddit, engaging with criticism earns credibility. Deleting it destroys it.
5. **Oversell the project.** "The best tax app for India" is worse than "An open-source alternative to ClearTax for freelancers."
6. **Use AI-generated stock copy.** Reviewers can smell it. Write in your own voice.
7. **Re-apply to Claude for OSS multiple times.** One clean submission is the rule. Follow up on the existing one if needed.
8. **Leak real PII into commits.** You already dodged this once with the DB backup-restore pattern. Always check `git status` before committing.

---

## 10. Daily Execution Checklist

Copy this into a note or GitHub Project. Check off each day.

### Day 1 (Today) — Setup + Release
- [ ] Tag and release v1.0.0
- [ ] Add CHANGELOG.md
- [ ] Add status badges to README
- [ ] Open 4 GitHub Discussions threads
- [ ] Commit: something small (test, comment, refactor)

### Day 2 — Content
- [ ] Record 60-90 second demo video
- [ ] Upload to YouTube, link from README
- [ ] Create social preview image (1280×640)
- [ ] Set social preview on GitHub
- [ ] Commit: something small

### Day 3 — Technical depth
- [ ] Add test coverage + badge
- [ ] Start work on Bank of Baroda parser
- [ ] Write launch blog post draft (publish Day 4)
- [ ] Commit

### Day 4 — Twitter + PH prep
- [ ] Finish Bank of Baroda parser
- [ ] Close issue #1 with merged PR
- [ ] Schedule Product Hunt launch for Day 5
- [ ] Post Twitter thread
- [ ] Commit

### Day 5 — Product Hunt launch
- [ ] 00:01 PT: go live on PH
- [ ] Respond to every comment within 30 min
- [ ] Share on LinkedIn
- [ ] Share on Indian maker Slacks/Discords
- [ ] Commit

### Day 6 — HN + Reddit
- [ ] 7-9 AM PT: post Show HN
- [ ] 11 AM IST: post r/india
- [ ] Afternoon: post r/IndiaTax + r/opensource
- [ ] IndieHackers launch post
- [ ] Respond to everything
- [ ] Commit

### Day 7 — Week 1 review + Dev.to
- [ ] Publish Dev.to technical article
- [ ] Review week 1 metrics (stars, issues, PRs)
- [ ] Respond to awesome-X PR feedback
- [ ] Commit

### Days 8-10 — Media outreach + bank parsers
- [ ] Pitch to Inc42, YourStory, Analytics India Magazine
- [ ] Create new "good first issue" for Canara Bank parser
- [ ] Review and merge any community PRs fast
- [ ] Commit daily

### Days 11-13 — Sustain
- [ ] Engage with any article / feature coverage
- [ ] Respond to Reddit/HN comments on old threads
- [ ] Keep commit streak alive
- [ ] Merge community PRs same-day if possible

### Day 14 — Polish + v1.1 release
- [ ] Tag v1.1.0 with any community contributions
- [ ] Update README with metrics (X stars, Y contributors)
- [ ] Review: is the application now materially stronger?
- [ ] Consider adding a comment to the Claude for OSS submission with an update link to the project's progress

---

## 11. Contingency: If Rejected

If Anthropic rejects the first application, the rejection email usually gives a reason (e.g., "not enough community traction" or "project too young"). In that case:

1. Wait 30 days minimum before any follow-up
2. Build the metrics from §8 to 2x the target levels
3. Reach out with a short, evidence-based email:

```
Hi [Anthropic OSS team],

My initial application for FreeFile ITR was declined on [date]. Since
then, the project has:

  • Grown from 0 to [X] stars organically
  • Accepted [Y] external contributor PRs from [Z] people
  • Been featured in [list]
  • Been added to [awesome-X lists]
  • Released v[X.Y]

I believe the project now meets the bar. Would you be open to
reconsidering? Repo: github.com/rohitthink/freefile

Thanks,
Rohit
```

Evidence beats pleading every time.

---

## 12. What to Prioritize if You Only Have Limited Time

If you can only do 3 things, do these:

1. **Product Hunt launch on Day 5.** Highest single-day traffic and stars.
2. **Show HN on Day 6.** Highest-quality developer audience; merged PRs often come from HN readers.
3. **Merge 1-2 of the awesome-X PRs.** Each merge drives 10-100 stars on autopilot.

If you can only do 1 thing: **Show HN on Day 6.** It's the single highest-leverage action for a developer tool.

---

## Appendix A: Current Repo Metrics (Day 0)

```
stars: 0
forks: 1
watchers: 0
open_issues: 6
unique_views_14d: 4
unique_clones_14d: 23
last_commit: 2026-04-15 (today)
```

## Appendix B: Application Content Snapshot

First name: Rohit
Last name: Ganguly
Email: welcome2ithink@gmail.com
GitHub: rohitthink
Repo: https://github.com/rohitthink/freefile
Submitted: 2026-04-15 06:42 UTC

## Appendix C: Already Open PRs Waiting for Review

1. https://github.com/Lissy93/awesome-privacy/pull/500
2. https://github.com/zhongkechen/awesome-local-first/pull/2
3. https://github.com/tauri-apps/awesome-tauri/pull/663
4. https://github.com/mjhea0/awesome-fastapi/pull/281
5. https://github.com/pluja/awesome-privacy/pull/766

Each merge = 10-100 organic stars + credibility signal for the Anthropic reviewer.

---

**Bottom line:** The application is submitted. The next 14 days determine the outcome. Execute the daily checklist, and the repo the reviewer sees will be materially different from the repo you submitted with.
