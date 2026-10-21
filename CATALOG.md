# Opportunity Desk daily catalog

Published dashboard: https://chris-selorm-gadze.github.io/opportunity-desk-pages/

The two existing daily discovery tasks publish public opportunity facts to `catalog.json` on `main` in `Chris-Selorm-Gadze/opportunity-desk-pages`. GitHub Pages publishes each commit. These data updates require no open dashboard or website rebuild. The tested publishing route uses the computer’s existing Git credential helper; Codex and local execution must be available for the scheduled run. The GitHub connector can read this repository, but its current integration returns HTTP 403 for content writes. Use the validated Git publisher below; do not try to expose a token or change permissions. Do not publish the task prompt or private profile information.

## Update procedure

1. Read this file and the latest `catalog.json` through GitHub, retaining the current file blob SHA. The website's cached copy is not the write base. Check official organizer pages for actionable new matches and factual changes. Never treat search snippets, earlier task results, event dates or typical annual windows as confirmed application cutoffs.
2. Preserve every existing entry and the other stream's metadata. Match by stable `id` or canonical application URL **and the same cycle**. Remove tracking parameters and fragments for deduplication. A genuinely new cycle needs a new ID so prior applications stay separate. Multiple application rounds may share a URL but require distinct, explicit cycle labels. Never delete historical opportunities; mark verified closed cycles `Past cycle`.
3. Add or update public facts only. Keep uncertainty, applicant fees, capped reimbursements, exclusions, and region/student-year limits explicit. Fully funded does not mean every applicant receives funding. Unreadable or missing dates stay blank and require verification. A date-only cutoff does not acquire a fabricated time. Keep timestamps in UTC only when the organizer's timezone is established, and preserve published wording in `sourceDeadline`.
4. Set `checkedOn` on each entry actually reviewed, not on the whole catalog. Update your stream's `checkedAt` (UTC ISO timestamp), `outcome`, and concise public `summary`, even if there were no new matches. Both tasks run daily around 9 AM America/Chicago. A check can legitimately find nothing new. Never advance a research timestamp without doing the research. For a partial source failure, preserve old facts and explain what could not be checked; use outcome `error` for a failed run.
5. Publish with the validated Git writer below. It increments the revision, validates every public field, preserves existing records and the other stream, and retries a rejected push from a fresh clone up to three times. Only catalog.json is committed. Do not write directly with the GitHub connector, which currently lacks content-write access.
6. Fetch the committed file through GitHub and verify the revision, stream timestamp, retained entries and exact changes. Check the public `catalog.json` after Pages deploys when possible. A successful commit is queued publication until its deployment succeeds. If writing, validation or publication fails, report the failure and direct dashboard link to the user; never say the dashboard was updated when only a chat response was produced. Use the next run to retry from a fresh remote copy.

Routine runs report only worthwhile new matches, material source/deadline changes, publishing failures or required user action. Remain quiet after unchanged, successful checks. These tasks cannot read browser-local notes, stage or checklists, so deadline alerts must not claim to know whether the viewer applied.

## Tested Git publisher

Fetch this repository into a fresh task-owned directory using HTTPS and the existing Git credential helper. Do not use the source checkout’s Sites remote. Run `node scripts/publish-catalog.mjs /absolute/path/to/public-update.json` from the fetched public repository. Node 22+ and Git are required. No package installation or API key is needed; the validator is bundled. The script uses an isolated temporary clone for each attempt, so it never resets or alters unfinished user work. Never disable approval checks or extract credentials. Network and push operations require the task’s normal authorized local execution.

The input JSON has exactly these fields:

```json
{
  "stream": "travel",
  "checkedAt": "2026-10-21T20:00:00.000Z",
  "outcome": "success",
  "summary": "Checked official sources; no new matching opportunities.",
  "opportunities": []
}
```

Replace the example timestamp with the actual research time. Use `trading` for that stream. `opportunities` contains only complete new/updated public entries in the contract below, not the full catalog. An empty list still publishes a truthful check result. Existing original entries may be refreshed; leave the other stream’s entries alone. A dry run is available by appending `--dry-run`; it validates against the current remote without committing or pushing.

The script verifies remote readback after pushing. `pagesDeployment: queued` means GitHub has the data but Pages is still deploying: check the public catalog after deployment before claiming the browser has the revision. If local execution or Git authentication is unavailable, report a publishing failure and link the dashboard; do not silently leave findings only in chat or claim a successful update. Never mark a failed run successful or manufacture a fresh research timestamp. Retry at the next run from a fresh remote copy.

Before a future website code deployment, copy the latest remote catalog into the source build input. Never replace live daily data with an old build’s catalog.

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
