```markdown
# TicketDeck

A single-page app for the markdown notes you keep per JIRA ticket. Built to sit
in a phone-width browser window beside your video call, so that when someone
says *"and what about PBLAT-5288?"* you are one tap away instead of three files
deep.

Your `.md` files stay exactly where they are and stay the source of truth. The
app reads and writes them in place.

## Run it

```bash
cd ticketdeck
python3 serve.py --open

```

That serves `./notes` on [http://127.0.0.1:7777/](https://www.google.com/search?q=http://127.0.0.1:7777/). Point it at your own folder:

```bash
python3 serve.py --notes ~/work/jira-notes --port 7800 --open

```

No build step, no `npm install`, no internet. Python 3.8+ and a browser.

**Make the window phone-shaped**: open it, then drag the window narrow (~380-430px)
and park it on the side of your screen. The layout is built for that width;
it also expands sensibly if you maximise it.

## The four samples

`notes/` ships with `START-HERE.md` plus three sample ticket notes that
demonstrate every feature. Clear them out when you are ready:

```bash
rm notes/START-HERE.md notes/PBLAT-*.md    # then drop your own .md files in

```

## What it does

**Switching** - every ticket is a chip in the top rail; one tap, or press
1-9. Swipe left/right works too. The shared project
prefix is stripped so `PBLAT-5331` shows as `5331` and six chips fit on screen.

**Jumping inside a ticket** - each `##` becomes a collapsible card with a chip
on the second row. f folds everything to a one-screen index.
o opens a full outline down to `####`.

**Finding** - / searches every note at once, grouped by ticket, with
highlighted snippets. Tap a result and it opens the note, expands the right
section and highlights the term.

**Rendering** - GFM markdown, tables (horizontally scrollable so they survive a
narrow window), syntax-highlighted code, Mermaid diagrams, and `png`/`jpg`/`svg`
images. Tap any diagram or image for a full-screen pan-and-zoom view - essential
when an architecture diagram meets a 400px window.

**Adding and removing on the go**

* a quick add - pick a section, type, choose bullet / to-do / quote / text
* e full editor with a toolbar, autosave and Ctrl+S
* pencil on any section header edits just that section
* checkboxes are live; ticking one rewrites the `- [ ]` in the file
* paste an image into the editor and it uploads to `notes/assets/` and links itself
* n scaffolds a new ticket note with a STAR + architecture skeleton
* ⋯ menu: star, reorder, rename, version history, delete

## Your files are safe

* Writes are atomic (temp file + rename), so a crash cannot truncate a note.
* Every save snapshots the previous version into `notes/.history/<id>/`
(last 25). Restore from **⋯ ➔ Version history**.
* Delete moves the file to `notes/.trash/`. Nothing is ever unlinked.
* If a file changed on disk since the tab loaded, the save is refused and you
are offered the choice - so editing in your IDE at the same time is safe.
* The app polls every 4 seconds, so IDE edits show up on their own.

## Layout

```
ticketdeck/
  serve.py        local server + JSON API (stdlib only, loopback only)
  index.html      shell
  app.js          the app
  app.css         phone-first styling
  notes/          your .md files  <- the source of truth
    assets/       images referenced as ![](assets/foo.png)
    .history/     automatic version snapshots
    .trash/       deleted notes

```

marked, DOMPurify, highlight.js and mermaid are pulled from esm.sh (pinned
versions) by `index.html`. Needs a network on first hit; jsDelivr/esm.sh cache
after that. Mermaid (~3.5 MB) is loaded lazily - only when a note actually
contains a diagram. To run fully offline: `npm i marked dompurify highlight.js mermaid && npx vite build` and swap the `<script type=module>` block for the
bundle.

## Front matter

Optional. Without it the title comes from the first `# H1` and the ticket key
from the filename.

```yaml
---
ticket: PBLAT-5331
title: Camelot event cloning
status: In Progress      # colours the pill: done/blocked/in progress
tags: [ backend, cloning ]
---

```

## Notes on hosting

It is deliberately loopback-only (`--host 127.0.0.1`) and has no auth. If you
later want it somewhere shared, that is the thing to add first - the API writes
files, so do not expose it as-is.

```

```