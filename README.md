# ResolveHQ: service transparency

Clickable prototype of ResolveHQ's **customer-facing request-status module**: helping business customers see where their service requests are and know when they need to act.

> Prototype only. Mock data, neutral placeholder visuals (the moodboard and palette are still to come). "Today" is fixed at Mon 16 Nov 2026.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## What's in it

| Screen | Route | What it shows |
| --- | --- | --- |
| Notification email | `#/email` | Where most visits start. Deep-links into the request detail (as Marcus). |
| Overview | `#/` | "Needs you" queue first, then counts (needs you / delayed / on track / done), delayed requests with reasons, recent updates. |
| Requests | `#/requests` | All requests with status tabs, search and team filter. Each row says in plain words where the request is, who has it and when to expect it. |
| Request detail | `#/requests/RQ-2041` | Action block (when you're needed), stage tracker, ETA range with confidence and delay reason, team hand-off timeline, and always-visible **Talk to someone** / **Escalate**. |

Use the **Viewing as** switch in the top bar to swap between:

- **Priya**, ops manager with ~10 requests (power user)
- **Marcus**, finance analyst with one urgent request (low tech comfort)

Try: open the email, upload the file, and watch the request move from "Needs you" to "On track". Or open a delayed request and escalate it.

## Design decisions to review

- **"Needs you" is the loudest thing** on every screen (solid blue). Delayed is amber, on track green, done grey.
- **Plain-language status sentence** on every request, written for the customer rather than as a ticket state.
- **Honest ETAs**: a date range plus confidence (high / medium / low) and, when delayed, the original date, the reason, and a committed next-update time.
- **Clock pause**: when a request waits for the customer, the ETA says it assumes they act by the due date.
- **Hand-offs are visible**: the timeline shows which team passed it to which, and why.
- **Help is always one click away**, not only after a delay. On mobile it's a sticky bar.
- "Waiting for you" in the tracker shows as dashed ("only if we need something") when it isn't needed.

## Not in scope

The agent tool, new-request form, notification settings and the rest of the platform. Assumes it sits inside ResolveHQ with SSO.

## Stack

Vite + React, no other dependencies. Mock data lives in `src/data.js`; colours are CSS variables at the top of `src/styles.css` so the palette can be swapped once it's agreed.
