# Design: how a tool looks and feels

For you, not the user. The bundled **impeccable** skill (`.agents/skills/impeccable/`, version 4.4.0, Apache-2.0, pinned; its engine is fetched by `bootstrap.ps1`) is your design craft: layout, type, colour, states, copy, accessibility, and a detector for the generic look AI tools produce. The workbench stays in charge of the conversation, the milestones and the safeguards. Where impeccable's own instructions disagree with this file, the session brief or `talking.md`, those win.

## When you use it

- **"The shape"** of a new tool stays a rough greyscale sketch of how the tool is used ([stack.md](stack.md#sketches)): what's on the screen and in what order, not how it looks. No impeccable yet. Once a tool has screens, sketches of changes are made from its own stylesheet and pieces, so they look like the tool.
- **Before any work on a tool's screens** (its first real screen at "thinnest working tool", or later, if the tool has none yet): write `tools/<name>/PRODUCT.md` yourself from the tool's NOTES and CONTEXT: who uses it (often just them), the one main action, the words, the constraints, anything they said about how it should feel. Their words, no interview. The design skill designs for what's in it, so without it you get a restyle, not a better tool. Then follow impeccable for that screen: its `SKILL.md` setup, `reference/operate.md` (a tool is Operate mode), `reference/craft-floor.md` before every UI edit. Stay inside the agreed shape. The look is your choice, like any technical choice; don't ask.
- **A website people are meant to look at** (a portfolio, a club's page, a landing page) is the exception: there the look is theirs to choose. Show 2-3 directions as static sketch files side by side (colour allowed; same rules as other sketches), one line each, your suggestion last; their pick goes into `tools/<name>/PRODUCT.md`, then impeccable builds it (Persuade or Experience mode, code-led).
- **Before every demo of a changed screen:** first `.workbench\scripts\run.cmd bun .workbench\scripts\design-check.ts <tool>` (the stylesheet against its own design system: values on the scales, contrast, no typed-in colours or shadows, one radius, one main button per screen; Electron and one HTML file). Fix everything it finds. Then the detector on the built page, which has the styles in it: `.agents\skills\impeccable\scripts\impeccable.cmd detect tools\<name>\app\.vite\renderer\main_window\index.html` (Electron, after `npm.cmd run package`), `tools\<name>\app\out\<title> (trying out).html` (one HTML file), `tools\<name>\app\dist\index.html` (website). The source `index.html` alone gives false findings (it doesn't see the CSS the code loads). Fix what it finds in one batch, rebuild, run it once more. Silent.
- **Before "Ship it" of a milestone that changed screens, and before sharing:** impeccable's harden (empty, long, missing and error states), clarify (labels and messages in the tool's CONTEXT words) and audit (keyboard, contrast, text size). Fix silently; at most one plain line in the hand-back if they'll notice ("Error messages now say what to do next").
- **"It looks plain / cluttered / make it nicer":** a normal small change, and "nicer" means easier to use first, looks second. Run impeccable's critique privately in this chat (no sub-agents, so don't ask about them) against `PRODUCT.md`, then fix the few things that matter most: what to do first and what's most important visible at a glance, an empty screen that says what to do, labels and messages in the tool's CONTEXT words (clarify, onboard, layout), then type and colour (typeset, colorize, quieter or bolder). Demo before/after on the trying-out copy.
- **Desktop tools (Electron, one HTML file):** where impeccable says to check desktop and mobile widths, check the window at its default size and maximised instead; never phone widths. Look at it through the trying-out copy, not a browser tab. The user's own reaction in the demo ("do you like how it looks and feels?") is the real test of the look.

## The design system and the hierarchy pass

From Refactoring UI (research note 18). The designer owns them.

- **Tokens.** The Electron and one-HTML-file starters' `app/src/index.css` open with a `:root` block: a spacing scale, a type scale (body 16px; 14px only for secondary text), two weights, ten greys, roles (`--text`, `--text-2`, `--surface-sunken`, `--border-control`, `--action`, ...), one radius, four shadows. Everything else in the stylesheet uses only those names; a value is always a step on a scale. A tool that needs something new gets a new token, not a typed-in value.
- **Feature first, greyscale first.** Design the screen that carries the one main action first, on real sample content; navigation and frames only when a second feature exists. Colour waits for "the look".
- **The look**, once the screens work: tint the greys slightly (same lightness, so contrast holds), and point `--action`, `--focus` and `--link` at one primary colour with ten shades (research note 18 has a checked ramp and status colours). Component rules don't change. Re-run `design-check.ts`.
- **The hierarchy pass**, on every screen before anything decorative: decide what's primary, secondary and quiet, for content and for actions. One solid main button (`button.primary`) per screen; others outlined or plain. Make the quiet things quieter (colour, weight, the small size) rather than the main thing bigger. Section titles stay small in a tool. A label next to a value that explains itself goes. Group by space before borders: more space around a group than inside it; a tone before a line. A destructive action that isn't the main one is quiet; the loud red is only in its confirm step.
- In `DESIGN.md`: the feel in one line (from `PRODUCT.md`), where the tool's tokens differ from the starter's and why, and per screen what's primary, secondary and quiet.

## The screens map (`tools/<name>/screens.json`)

The designer's formal record of the flows, kept from "the shape" on, because sketches aren't saved and the agreed flow must not live only in chat. Words are the user's; `does` names the model's event (`<thing>:<event>` from `model-check.ts --summary`) or a plain command the model has no event for (`open-file`, `export`).

```json
{
  "screens": [
    { "id": "owing", "word": "Who still owes", "first": true,
      "shows": ["member: name, band, paid so far, still owing", "the 'check these' list first when it has rows"],
      "actions": [
        { "label": "Open this month's bank file", "does": "open-file" },
        { "label": "Mark as left", "does": "member:leave", "greyedWhen": "already left" }
      ],
      "leadsTo": ["member"],
      "empty": "Open a bank file to see who still owes." }
  ]
}
```

`model-check.ts <tool>` compares it with the model: an event no screen offers, or an action the model doesn't have, is a `DESIGN` gap. Every screen also states its empty state, and every action the model can refuse has `greyedWhen` with the reason the user will read.

## What never reaches the user

- Impeccable's vocabulary and reports: no command names, scores, heuristic names, "degraded" banners, design jargon, long reviews. Say what changed in their words: "The totals now stand out and the two buttons are easier to tell apart."
- Its interviews and questions: no init interview, no decision page, no question pages, no live mode. Anything that must be asked goes through [talking.md](talking.md): one question, with your suggestion. A sketch file shows a choice.
- Nothing that opens a port (`serve-question`, `live-server`, live mode), no image generation and no API keys or paid calls (`.impeccable/config.json` sets the code-led path), never `npx impeccable`, `update`, `install`, `hooks`, `pin`, or doctor repairs. Its updates come with the workbench's.
- Never run its commands with escalated permissions: inside Codex's sandbox they work offline and reach no website. If the launcher says the engine is missing, run `bootstrap.ps1` (with the user's approval); never let it download into the home folder.

## What it doesn't change

- "One milestone per turn, the smallest change": impeccable's ambition is about quality, never about doing more than the milestone. A redesign keeps what the tool does and its data; clearer labels in the tool's own words are part of the design, but a new feature is a new change.
- Where things go: `tools/<name>/PRODUCT.md` and `DESIGN.md` (impeccable writes DESIGN.md once a look is settled), and `tools/<name>/.impeccable/` for its briefs and critiques (saved), screenshots and review files (not saved). The project's `.impeccable/config.json` belongs to the workbench.
