# Opportunity Desk daily catalog

Published dashboard: https://chris-selorm-gadze.github.io/opportunity-desk-pages/

The two existing daily discovery tasks publish public opportunity facts to `catalog.json` on `main` in `Chris-Selorm-Gadze/opportunity-desk-pages`. GitHub Pages publishes each commit. This is an unattended data update: it requires no open browser, local files, personal application records, or website rebuild. Use the connected GitHub tools with the user's existing authorization to maintain this public catalog. Do not publish the task prompt or private profile information.

## Update procedure

1. Read this file and the latest `catalog.json` through GitHub, retaining the current file blob SHA. The website's cached copy is not the write base. Check official organizer pages for actionable new matches and factual changes. Never treat search snippets, earlier task results, event dates or typical annual windows as confirmed application cutoffs.
2. Preserve every existing entry and the other stream's metadata. Match by stable `id` or canonical application URL **and the same cycle**. Remove tracking parameters and fragments for deduplication. A genuinely new cycle needs a new ID so prior applications stay separate. Multiple application rounds may share a URL but require distinct, explicit cycle labels. Never delete historical opportunities; mark verified closed cycles `Past cycle`.
3. Add or update public facts only. Keep uncertainty, applicant fees, capped reimbursements, exclusions, and region/student-year limits explicit. Fully funded does not mean every applicant receives funding. Unreadable or missing dates stay blank and require verification. A date-only cutoff does not acquire a fabricated time. Keep timestamps in UTC only when the organizer's timezone is established, and preserve published wording in `sourceDeadline`.
4. Set `checkedOn` on each entry actually reviewed, not on the whole catalog. Update your stream's `checkedAt` (UTC ISO timestamp), `outcome`, and concise public `summary`, even if there were no new matches. Both tasks run daily around 9 AM America/Chicago. A check can legitimately find nothing new. Never advance a research timestamp without doing the research. For a partial source failure, preserve old facts and explain what could not be checked; use outcome `error` for a failed run.
5. Increment `revision` by one and set `updatedAt` to the current UTC ISO timestamp. Use GitHub's update-file tool with the latest blob SHA and a concise commit message. Only change `catalog.json`; no assets or application code are needed. On a SHA conflict, refetch, reapply your changes while preserving concurrent updates, then retry at most three times. Do not overwrite a concurrent stream's work.
6. Fetch the committed file through GitHub and verify the revision, stream timestamp, retained entries and exact changes. Check the public `catalog.json` after Pages deploys when possible. A successful commit is queued publication until its deployment succeeds. If writing, validation or publication fails, report the failure and direct dashboard link to the user; never say the dashboard was updated when only a chat response was produced. Use the next run to retry from a fresh remote copy.

Routine runs report only worthwhile new matches, material source/deadline changes, publishing failures or required user action. Remain quiet after unchanged, successful checks. These tasks cannot read browser-local notes, stage or checklists, so deadline alerts must not claim to know whether the viewer applied.

## JSON contract (schemaVersion 1)

The root contains exactly `schemaVersion: 1`, positive integer `revision`, ISO UTC `updatedAt`, `streams`, and `opportunities` (1–1,000 entries). Streams have unique `id` (`travel` or `trading`), `label`, `checkedAt`, `outcome` (`success` or `error`), and public `summary`. Keep both streams.

Each opportunity has exactly these fields. Copy a matching existing entry for the shape; do not invent additional fields.

| Fields | Type / requirement |
| --- | --- |
| id | Unique stable string, up to 100 characters; prefix new IDs with a readable program name and cycle |
| title, organization | Program and organizer names; title up to 250 characters |
| category | Scholarships; Career & sales; Startup competitions; Research programs; Innovation challenges; Finance & bounties; Grants & funding; Travel & leadership; Conferences & networking; Opportunity hubs |
| levels | Array drawn from High school, Undergraduate, Graduate, Early career, Professional, Founder, Organization, All levels; include restrictions in eligibility |
| tags | Array of short public search keywords, at most 30 |
| url, sourceUrl | HTTP(S) application/organizer URL and supporting factual source, respectively |
| summary | Plain-language program description, including event location/dates where relevant |
| eligibility | Public restrictions and what applicants must verify; never claim this viewer is eligible |
| reward | Funding/prizes, applicant fees, caps, reimbursement method and uncovered costs |
| value, effort | Neutral editable planning defaults: value 1–5, effort 1–1,000 hours; never personalize |
| deadlineDate | Organizer-local YYYY-MM-DD application/qualifier deadline, or empty string |
| deadlineAt | UTC ISO cutoff only with verified timezone; otherwise empty string |
| sourceDeadline | Published deadline wording or explicit uncertainty; distinguish event end from entry cutoff |
| confidence | Exact time; Date only; Timezone unconfirmed; Unknown. Exact timestamps require Exact time plus a date |
| opensOn | Confirmed YYYY-MM-DD opening date, otherwise empty string |
| cycle | Explicit intake/year/round label; keep stable for deduplication |
| sourceState | Application; Upcoming; Past cycle; Needs verification; Directory |
| sourceNote | Verification context, source caveats and corrections to earlier claims |
| checkedOn | Actual review YYYY-MM-DD, or empty string for unchecked facts |
| suggestedTasks | Array of generic application checklist titles; no completion states or personal due dates |
| stream | original, travel or trading (preserve original on original links) |

Never include `notes`, `stage`, `fit`, `eligibilityStatus`, `targetDate`, `followUpDate`, `pinned`, personal task completions, settings, credentials or identity. The app rejects malformed catalogs and preserves the saved workspace. It merges updated source facts only when the viewer has not edited them; conflicts remain visible for review. It never replaces application progress or deletes missing records.
