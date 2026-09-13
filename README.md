# TicketDeck

A single-page app for the markdown notes you keep per JIRA ticket. Built to sit
in a phone-width browser window beside your video call, so that when someone
says *"and what about PBLAT-5288?"* you are one tap away instead of three files
deep.

This version is designed to be hosted entirely as a static site (like on GitHub Pages).

## Add your Markdown Files

Simply add your `.md` files into the `notes/` directory.

## Build

To compile your markdown files so they can be read by the frontend, run:
```bash
node build.js
```
This will generate `notes.json`.

## Hosting on GitHub Pages

1. Ensure your `.md` files are in `notes/`
2. Run `node build.js` to build `notes.json`
3. Commit and push everything to GitHub.
4. Enable GitHub Pages on your repository to serve from the `main` branch.
