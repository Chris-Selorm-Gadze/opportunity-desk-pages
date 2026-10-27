# Opportunity Desk daily catalog

Published dashboard: https://chris-selorm-gadze.github.io/opportunity-desk-pages/

Three discovery tasks and an hourly spreadsheet sync publish public opportunity facts to `catalog.json` on `main` in `Chris-Selorm-Gadze/opportunity-desk-pages`. GitHub Pages publishes each commit. These data updates require no open dashboard or website rebuild. The tested publishing route uses the computer’s existing Git credential helper; Codex and local execution must be available for the scheduled run. The GitHub connector can read this repository, but its current integration returns HTTP 403 for content writes. Use the validated Git publisher below; do not try to expose a token or change permissions. Do not publish the task prompt or private profile information.

## Update procedure

1. Read this file and the latest `catalog.json` through GitHub, retaining the current file blob SHA. The website's cached copy is not the write base. Check official organizer pages for actionable new matches and factual changes. Never treat search snippets, earlier task results, event dates or typical annual windows as confirmed application cutoffs.
2. Preserve every existing entry and the other streams' metadata. Match by stable `id` or canonical application URL **and the same cycle**. Remove tracking parameters and fragments for deduplication. A genuinely new cycle needs a new ID so prior applications stay separate. Multiple application rounds may share a URL but require distinct, explicit cycle labels. Never delete historical opportunities; mark verified closed cycles `Past cycle`.
3. Add or update public facts only. Keep uncertainty, applicant fees, capped reimbursements, exclusions, and region/student-year limits explicit. Fully funded does not mean every applicant receives funding. Unreadable or missing dates stay blank and require verification. A date-only cutoff does not acquire a fabricated time. Keep timestamps in UTC only when the organizer's timezone is established, and preserve published wording in `sourceDeadline`.
4. Set `checkedOn` on each entry actually reviewed, not on the whole catalog. Update your stream's `checkedAt` (UTC ISO timestamp), `outcome`, and concise public `summary`, even if there were no new matches. Finance/internship discovery runs at 9 AM and 3 PM America/Chicago; travel and trading discovery remain daily around 9 AM. The connected spreadsheet is checked hourly. A check can legitimately find nothing new. Never advance a research timestamp without doing the research. For a partial source failure, preserve old facts and explain what could not be checked; use outcome `error` for a failed run.
5. Publish with the validated Git writer below. It increments the revision, validates every public field, preserves existing records and the other streams, and retries a rejected push from a fresh clone up to three times. Only catalog.json is committed. Do not write directly with the GitHub connector, which currently lacks content-write access.
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

Replace the example timestamp with the actual research time. Use `trading`, `internships` or `spreadsheet` for the other streams. `opportunities` contains only complete new/updated public entries in the contract below, not the full catalog. An empty list still publishes a truthful check result. Existing original entries may be refreshed; leave the other stream’s entries alone. A dry run is available by appending `--dry-run`; it validates against the current remote without committing or pushing.

The script verifies remote readback after pushing. `pagesDeployment: queued` means GitHub has the data but Pages is still deploying: check the public catalog after deployment before claiming the browser has the revision. If local execution or Git authentication is unavailable, report a publishing failure and link the dashboard; do not silently leave findings only in chat or claim a successful update. Never mark a failed run successful or manufacture a fresh research timestamp. Retry at the next run from a fresh remote copy.

Before a future website code deployment, copy the latest remote catalog into the source build input. Never replace live daily data with an old build’s catalog.

### Curated public research

For a user-requested review outside the four scheduled discovery feeds, use the same publisher with input `stream: "curated"`. This is a publishing mode, not a fifth dashboard feed. All other input fields and public-entry validation rules are unchanged. New entries use `stream: "original"`; updates retain their existing ID, cycle, stream ownership and exact spreadsheet provenance. Every included entry must have `checkedOn` equal to the UTC date of the actual `checkedAt`. Do not invent spreadsheet provenance or import personal application information. The four scheduled streams and their freshness metadata remain unchanged; the catalog revision, publication time and reviewed records are refreshed. Remote readback confirms the exact curated records. Use this mode for verified scholarship additions and corrections without rebuilding the website or mislabeling them as internship, travel or spreadsheet discoveries.

## JSON contract (schemaVersion 1)

The root contains exactly `schemaVersion: 1`, positive integer `revision`, ISO UTC `updatedAt`, `streams`, and `opportunities` (1–1,000 entries). Streams have unique `id` (`travel`, `trading`, `internships` or `spreadsheet`), `label`, `checkedAt`, `outcome` (`success` or `error`), and public `summary`. Keep all four streams.

Each opportunity has these required fields and an optional validated `sheet` provenance object. Copy a matching existing entry for the shape; do not invent additional fields.

| Fields | Type / requirement |
| --- | --- |
| id | Unique stable string, up to 100 characters; prefix new IDs with a readable program name and cycle |
| title, organization | Program and organizer names; title up to 250 characters |
| category | Scholarships; Internships; Career & sales; Startup competitions; Research programs; Innovation challenges; Finance & bounties; Grants & funding; Travel & leadership; Conferences & networking; Opportunity hubs |
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
| sourceState | Application; Open listing; Upcoming; Past cycle; Needs verification; Directory |
| sourceNote | Verification context, source caveats and corrections to earlier claims |
| checkedOn | Actual review YYYY-MM-DD, or empty string for unchecked facts |
| suggestedTasks | Array of generic application checklist titles; no completion states or personal due dates |
| stream | original, travel, trading, internships or spreadsheet (preserve original on original links) |

Never include `notes`, `stage`, `fit`, `eligibilityStatus`, `targetDate`, `followUpDate`, `pinned`, personal task completions, settings, credentials or identity. The app rejects malformed catalogs and preserves the saved workspace. It merges updated source facts only when the viewer has not edited them; conflicts remain visible for review. It never replaces application progress or deletes missing records.

## Internship research

Use category `Internships` and stream `internships` for new industry or research placements with real internship work. Existing original research entries and other streams keep their ownership and category; do not duplicate them. Insight days, conferences, competitions and general job directories remain in their existing categories. Cover undergraduate, community-college, graduate and other explicitly eligible applicant levels; do not imply every level qualifies. Include location/remote rules, paid or unpaid status, duration, degree or graduation window, citizenship/work authorization and confirmed sponsorship restrictions in the public fields. Label pay units and distinguish annualized salary from total internship earnings. Verify live official employer or program pages rather than relying on job-board expiration dates.

`Open listing` means an official current application is available but no fixed closing date is published. Leave deadlineDate and deadlineAt empty, use confidence `Unknown`, and explain that applicants should apply early. This state enters the active queue without inventing a deadline or calendar event. Call it rolling only if the organizer explicitly says so. A missing date alone never proves a listing is open. Check for closure on later runs and mark verified closed cycles `Past cycle`. Keep source time-zone contradictions date-only with `Timezone unconfirmed` until resolved.


## Connected spreadsheet sync

The source is accessed read-only through the Google Drive/Sheets connector by its configured scheduled task. Keep the spreadsheet URL/ID, task prompt and connection details out of this public repository. Do not make the Sheet public, alter its sharing or embed credentials. Publish only opportunity facts. Personal Best Fit, Status, Notes / Next Action, submissions and confirmations are excluded. The Sheet itself is never edited by this sync.

Read metadata first and use the exact visible tab and bounded ranges. Read the title column through its existing grid bounds to find every populated row, then read only the relevant fact columns. Resolve the headers each run instead of assuming fixed positions: Opportunity, Category, Application Deadline, Next Milestone, Competition / Program Date, Prize / Funding, Location / Format, Eligibility Notes, Required Materials and Source URL. Preserve hyperlinks with cell reads. Re-read a malformed row narrowly to recover public facts; a URL embedded in a personal-note cell does not authorize publishing the surrounding text. Do not copy private columns or raw cell objects into an input file.

Create a task-private JSON snapshot with exactly `checkedAt` (actual UTC read time), `complete` (true only after a complete source read), `rows` and optional `overrides`. Each row has exactly the ten string keys `title`, `category`, `deadline`, `milestone`, `programDates`, `funding`, `location`, `eligibility`, `materials`, `url`; optional numeric `row` is for local diagnostics only. No notes, status, fit, personal profile or Sheet identifier belongs in this snapshot. Use a public organizer/source URL for each row. Reword personalized eligibility notes as general public requirements without asserting the viewer qualifies.

Fetch a fresh copy of this public repository, then run:

`node scripts/import-spreadsheet.mjs /absolute/task-private-public-facts.json --publish`

Without `--publish`, the command writes a validated patch beside the input for review. It requires no package installation or Sheet API key. It uses the same isolated Git publisher and remote readback as the discovery streams. The snapshot is never committed. The importer categorizes opportunities, matches existing programs and cycles by stable identity, handles URL variants and row reordering, and retains all historical records. New cycles use new IDs. A row removed from a complete Sheet read is marked absent in its optional `sheet` metadata, without deletion or an inferred application closure. Incomplete or invalid reads cannot mark entries absent. Existing application progress stays in each viewer’s browser.

A `sheet` object contains a stable 64-hex `key`, 64-hex content `hash`, actual UTC `checkedAt` for the last changed source snapshot, `present` boolean and `fields` containing only the ten public fact strings above. Do not change these by hand. Optional `verifiedAt` is added only when organizer facts were independently reviewed in this run. Other research streams must preserve `sheet` metadata; the publisher retains it even if an older task omits it.

Spreadsheet dates are secondary reports. They enter the dashboard with `Needs verification`, no fabricated exact time, and blank `checkedOn` until the organizer is reviewed. They can appear as clearly labeled date-planning markers and priority leads. Conflicts, approximate dates, opening dates and event/host deadlines are not promoted to confirmed application cutoffs. Rolling text alone does not prove a live application. Prior organizer-verified facts are retained, while current Sheet reports remain visible in Source & details.

For independently checked corrections, optional `overrides` maps the exact row title to public fields from the organizer. It must include supporting `sourceUrl`, actual `checkedOn` and `sourceNote`; only organization, summary, eligibility, reward, levels, deadlineDate, deadlineAt, sourceDeadline, confidence, opensOn and sourceState may additionally be set. Exact times require a known organizer timezone and UTC conversion. This is the only route by which a Sheet sync may replace another research stream’s primary facts. Ownership and other stream freshness remain intact. Metadata-only imports preserve concurrent primary-source corrections.

After publishing, verify the public revision, source-row count and preserved records after Pages deploys. If nothing changed, a successful check may publish truthful freshness metadata with no record changes. Do not claim an instant webhook: this is an hourly check and requires the computer on with Codex running. Stay quiet after unchanged successful checks; report meaningful additions, deadline corrections, source-read or publication failures and required user action. Preserve all daily discovery schedules.

## Finance and technology view

Finance internships share the `internships` stream. New finance discovery and the active finance collection are limited to U.S. work locations. Remote roles require explicit employer permission to work from the U.S.; a U.S. headquarters, an Americas label or a sponsorship question does not establish a U.S. placement. Multi-country programs may be included for verified U.S. offices only, with country-specific pay and sponsorship clearly distinguished. Use the public tag `Location: US` only when supported by official work-location evidence. Foreign-only and unresolved-location catalog records remain stored without inferred closure; they are excluded from the U.S. role queues. Existing personal application records remain accessible as clearly labeled history even when their location is outside the U.S. or unconfirmed. Other opportunity categories retain their existing scope. Use the public tag `Financial institution` plus `Finance technology` or `Finance analyst` so the dedicated view can classify them. Use exactly one sponsorship tag: `Sponsorship: Supported`, `Sponsorship: Conditional`, `Sponsorship: Not offered` or `Sponsorship: Not stated`. Affirmative support requires an employer statement; a sponsorship question or equal-opportunity wording does not prove support. Conditional support must retain its limits in eligibility/source notes. Broken application links remain unverified, even if an indexed description offers sponsorship.

For explicit monthly graduation windows, use `Graduation: YYYY-MM to YYYY-MM`; for an explicit class year use `Graduation: YYYY`. Do not turn seasonal wording into invented monthly bounds. The browser can compare these public ranges with a viewer's private graduation preference. Application counts, assessment deadlines and location restrictions belong in the description/checklist.

Finance profiles, application records, selected stages, priority pins and follow-up dates are private browser data. Never seed an individual's status, graduation or immigration needs into this public catalog or website code. The generic finance card can track technology audit, engineering, cybersecurity, data/AI, quant and traditional analyst applications, including privately recorded roles whose public listings are closed.
