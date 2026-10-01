# Refactoring UI as a rulebook for the designer role: what to take, what impeccable already says

Scope: what the book *Refactoring UI* (Adam Wathan and Steve Schoger) gives an AI **designer** role that owns a tool's screens, flows and design system and never talks to the user. The role reads only its own artifacts (`tools/<name>/DESIGN.md`, a screens/flows map, a short summary from the modeller) and returns sketches and design decisions. This note compares the book with the bundled impeccable skill (4.4.0), tests a few of its rules as scripts, and proposes a starter set of tokens for the Electron starter. Research date 2026-10-01. I read the whole book from the author's own PDF (all body text, pages 7-252); page numbers below are the PDF's, which equal the printed ones. The book is a commercial work: everything is paraphrased, short phrases are quoted, no figures are reproduced.

Tags: `[INFERENCE]` is my reasoning. `[UNVERIFIED]` means I could not confirm it in a source I opened. `[LOCAL]` means I ran it on this machine (Windows 11, Bun). `[REPO]` is a fact about this repository's skill files as read today. `[BOOK]` is a statement the book makes, with its page.

**Limit of the text I could read.** The PDF's text layer has no figure content. The book's own numeric scales (spacing and sizing p.73, type p.105, shadows p.183) are figures, so I could not read their values. The token values proposed below are therefore **mine**, built to the rules the book states in words (hand-picked, a 16px base, steps no closer than about 25%, 8-10 greys, 5-10 shades per colour, about five shadows) and contrast-checked here `[LOCAL]`. I do not claim they are the book's numbers.

## Recommendations for the designer role

Each: what the designer does, when, the artifact it writes or checks, the skill file that would change, and why.

1. **Design one feature at a time, in greyscale, on the user's real sample content. The shell (navigation, frame) is decided last.**
   - Does: for a new tool, sketches the one screen that carries the main action first (the fields, the result, the one button); adds navigation only when a second feature exists. Keeps greys, spacing and size doing the work; no colour, icons or shadows at this stage.
   - When: "the shape" milestone and the tool's first real screen.
   - Artifact: sketch file in `tools/<name>/sketches/`; one line in DESIGN.md "Decided and why" if the shell choice was deferred.
   - Skill files: `workbench/design.md` ("When you use it", first bullet) gets the rule stated for the designer; `stack.md` "Sketches" already says greyscale for new tools and stays.
   - Why: [BOOK] ch. "Starting from Scratch": "Start with a feature, not a layout" p.8-11; "Detail comes later", hold the colour, p.12-15. Partly already true here: the shape sketch is greyscale [REPO `stack.md`].

2. **Run a hierarchy pass on every screen before anything decorative.** Write down, per screen, what is primary, secondary and tertiary, and the same for actions: one solid primary button, secondary actions as outline or low-contrast, tertiary as plain links.
   - Does: makes the quiet things quieter (lighter colour, lighter weight) instead of making the main thing louder or bigger; shrinks section titles in app screens; drops "Label: value" pairs where the value explains itself ("3 bedrooms" style), and lets the label be small and soft where it must stay; a destructive action that is not the main action gets secondary treatment, with the loud red button only in its confirmation step.
   - When: first real screen of each tool, and every time a screen gains an element.
   - Artifact: the "Screens" entries in DESIGN.md (template below); the script checks for more than one primary button per screen.
   - Skill files: new designer brief (proposed `workbench/designer.md`) and the Screens block in the DESIGN.md template.
   - Why: [BOOK] ch. "Hierarchy is Everything" p.36-62 ("Size isn't everything" p.38, "Emphasize by de-emphasizing" p.46, "Labels are a last resort" p.48, "Separate visual hierarchy from document hierarchy" p.54, "Semantics are secondary" p.60). This is the biggest gap in impeccable's text (see Overlap).

3. **Own a small token set, and use nothing that isn't in it.** Spacing, type sizes, weights, greys, one primary ramp, status colours, radius, shadows, as CSS custom properties at the top of the tool's `index.css`. A picked value is always a step on a scale. Choosing between two sizes means trying the neighbours: if two of three look obviously wrong, the middle one is right.
   - When: before the first real screen (the starter ships the set), and edited only on purpose.
   - Artifact: the `:root` block in `index.css`; DESIGN.md lists only where the tool differs from the starter.
   - Skill files: the Electron starter's `index.css` (proposal below), `stack.md` "Sketches" (sketches take the tool's stylesheet, so they inherit the tokens), `design.md`.
   - Why: [BOOK] "Limit your choices" p.28-32; "Establish a spacing and sizing system" p.70-75; "Establish a type scale" p.102-107; "Define your shades up front" p.148-151.

4. **Check the numbers with a script after every build, silently, before the impeccable detector.** About a dozen checks on the built stylesheet and page: values off the scale, more than the allowed sizes or weights, contrast, input borders under 3:1, more than one primary button, hard-coded colours outside the tokens, border count, mixed radii, ambiguous spacing (section "Checkable by script"). Findings are fixed in one batch; nothing reaches the user.
   - When: where `design.md` already runs the detector ("Before every demo of a changed screen").
   - Artifact: a script (proposed `.workbench/scripts/design-check.mjs`; a new script needs a line in the save scripts' explicit list [REPO, note 11 rec 5]) and its one-line result in the designer's return.
   - Why: the book's rules are mostly arithmetic; checking them is cheaper and steadier than judging by eye. I ran the static checks on the starter and a bad sample `[LOCAL]` (below), and found a real issue in the starter.

5. **Group by space before borders or boxes.** Start every layout with too much room and remove it until it looks right; keep more space *around* a group than inside it (a label sits closer to its own field than the gap between fields); give a form or text block the width it needs rather than the window's width; use a fixed width for a sidebar and let the main area flex.
   - When: every layout; the script checks label-to-field spacing and `max-width` on forms and prose.
   - Skill files: designer brief; `layout.md` of impeccable already covers grouping and stays as is.
   - Why: [BOOK] "Start with too much white space" p.66-69; "Avoid ambiguous spacing" p.96-99; "You don't have to fill the whole screen" p.76-83; "Grids are overrated" p.84-91.

6. **Use two weights, three text greys, a small set of sizes, and keep headings modest.** Text in a dark grey for primary, a mid grey for secondary, a lighter grey (still readable) for tertiary; weights 400 and 600 only; page and section titles small in an app; right-align number columns; align mixed sizes on one line by baseline; letter-space only all-caps text; line-height tighter as text gets bigger.
   - Artifact: the type roles in the tokens; script checks sizes, weights, off-scale values, uppercase without tracking, right-aligned numbers.
   - Skill files: starter `index.css` (the comment "Keep font sizes at 16px or more" becomes a role table; see Open questions, it is a real change), designer brief.
   - Why: [BOOK] p.38-41, 54-55, 102-107, 118-125, 128-135.

7. **Choose colour in this order: greys, one primary, then status colours; never grey text on a coloured background.** On colour, secondary text is a hand-picked tint of the background's hue; light-on-dark that gets too dark is solved by flipping to dark-on-light tint; meaning is never carried by colour alone.
   - When: only after the greyscale screen works ("look later"); the tokens are swapped in one place.
   - Artifact: the colour tokens; script checks contrast, grey-on-colour, shade counts.
   - Why: [BOOK] "Working with Color" p.138-168: "You need more colors than you think" p.142, "Greys don't have to be grey" p.158, "Accessible doesn't have to mean ugly" p.162, "Don't rely on color alone" p.166, plus "Don't use grey text on colored backgrounds" p.42.

8. **Reduce borders and give depth by role.** Separate things with background tone, then space, then a soft shadow, and only then a border; at most five shadow sizes, each tied to a role (button, card, dropdown, dialog, dragged item), with raised things lighter or shadowed and sunken things darker.
   - Artifact: elevation and border tokens; script counts borders and shadow values not in the set.
   - Why: [BOOK] "Creating Depth" p.172-197 (light source, elevation system p.180, two-part shadows p.186, flat designs p.190); "Use fewer borders" p.238-241.
   - Caveat: impeccable's "declare elevation once, border or shadow" is the same instinct (Overlap).

9. **Design the empty state first and treat it as a screen.** For a tool that starts with no data, the first screen the user sees is the empty one: one plain sentence in the user's words about what will appear, one clear action, no tabs or filters that do nothing yet.
   - When: first screen, then again in every harden pass.
   - Artifact: an "Empty" line per screen in DESIGN.md.
   - Why: [BOOK] "Don't overlook empty states" p.234-237. Impeccable already says this strongly (`onboard.md`, `operate.md`), so this is a reinforcement, not new.

10. **Turn "how it should feel" into four settings, not an interview.** From `PRODUCT.md` and what the user said, the designer fixes: type (system sans by default), colour (blue is the safe default, "nobody ever complains"), corner radius (one value everywhere), and the tone of the words. It writes them as a line in DESIGN.md and never asks the user to choose a "personality".
    - Why: [BOOK] "Choose a personality" p.20-27 (font, colour, radius, language; do not copy competitors; stay consistent). It is cheaper than impeccable's world workshop for a tool for one person (`new-work.md`).

11. **Work in short cycles; design the smallest useful version; park nice-to-haves.** DESIGN.md has a "Later" list. A screen never shows a control the implementer isn't asked to build this milestone.
    - Why: [BOOK] "Don't design too much" p.16-19 ("be a pessimist"). It matches the workbench's one-milestone-per-turn rule [REPO `design.md`].

12. **Skip these parts of the book for workbench tools** (they fit marketing sites or phone-first products): shrinking the canvas to a 400px phone layout first (p.78), responsive em/rem relationships (p.92-95), overlapping layers and hero images (p.194-207), decorative background patterns (p.228-233), "think outside the box" redesigns of standard controls (p.242-247). For a website people look at, `design.md` already hands the look to impeccable's Persuade/Experience modes.

## The book by chapter, as rules an AI designer can apply

**Starting from Scratch (p.7-33)**
- Begin with a single feature's own elements (its fields, button, result); do not begin with nav or a frame. Decide the frame after two or three features exist. [p.8]
- Low fidelity first: thick lines, no typefaces, shadows or icons; greyscale first so spacing, contrast and size carry the hierarchy. Colour is added to a screen that already works. [p.12-13]
- Sketches are disposable; leave them behind once decided. [p.14]
- Don't design every feature and edge case up front; design a simple version, build it, fix what the real thing shows, then design the next. Don't draw features you aren't ready to build; if something is nice-to-have, design it later. [p.16-19]
- Personality comes from four things: type, colour, corner radius, the words. Keep one radius; don't mix square and round. Look at what the audience already uses, but don't imitate a direct competitor. [p.20-27]
- Don't tune values one pixel at a time. Pick from a set defined in advance: 8-10 shades per colour, a type scale, spacing, weights, line heights, widths, shadows, radius, border width, opacity. Try the neighbour values to choose. [p.28-32]

**Hierarchy is Everything (p.35-63)**
- Visual hierarchy is how important elements look relative to each other; deliberately quiet the secondary and tertiary. [p.36-37]
- Don't lean on size alone. Raise importance with weight, lower it with a softer colour. About three text colours (dark, grey, lighter grey) and two weights (400/500 and 600/700); no weights under 400 in UI. [p.38-41]
- On coloured backgrounds, lower contrast by picking a colour of the same hue; don't use grey, and avoid white text with reduced opacity (it looks washed out and shows the background through). [p.42-44]
- If the main element doesn't stand out, quiet its competitors (inactive nav items, a sidebar with its own background). [p.46-47]
- Avoid "label: value". Let format or context say what the value is; merge label and value ("12 left in stock"); if a label stays, make it secondary; if users scan for the label (specs), make the label darker and the value slightly lighter. [p.48-53]
- Pick tags by meaning, style by hierarchy. Section titles in apps are often labels and should be small, or hidden visually while kept in the markup. [p.54-55]
- Bold and solid icons are "heavy". Soften an icon's colour to balance it against text; give thin low-contrast borders more width instead of a harsher colour. [p.56-59]
- Each page has about one primary action (solid, high contrast), some secondary (outline or low contrast), a few tertiary (link style). Destructive isn't automatically big and red: use a secondary treatment, then make it the big red primary in the confirmation. [p.60-62]

**Layout and Spacing (p.65-99)**
- Start with far too much space and remove it; whitespace is easier to take away than to guess. Dense layouts are fine when many items must be visible at once, but as a decision. [p.66-69]
- A scale built from a base (16px) and its multiples and factors, packed at the small end and spreading apart, no two values closer than about 25%. Not a plain multiple of 4. Design in the browser, typing numbers. [p.70-75]
- Use only the width needed (600px if 600px does it); split supporting text into a column rather than widening a form. [p.76-83]
- A grid is a tool, not a law: fixed-width sidebar, flexible main area; cap widths with `max-width` and shrink only when the window is smaller; percentages only when you want scaling. [p.84-91]
- Don't tie everything to relative sizes; sizes at different widths and padding inside buttons need separate tuning (a large button gets proportionally more padding). [p.92-95]
- Make sure space *around* a group exceeds space *within* it: forms (label-to-field vs field-to-field), headings (more space above than below), bullet lists, horizontal groups. [p.96-99]

**Designing Text (p.101-135)**
- A hand-picked type scale; fewer sizes; px or rem, not nested em, so every computed size lands on the scale. A modular ratio gives fractional values and too few sizes for UI. [p.102-107]
- Safe UI type is a neutral sans or the system font stack; prefer families with many weights; prefer popular families; avoid condensed or short-x-height families for main UI text. [p.108-113]
- Paragraph width 45-75 characters (about 20-35em) even when the container is wider. [p.114-117]
- Mixed sizes on one line align on the baseline, not the centre. [p.118-121]
- Line-height is proportional to line length (narrow text ~1.5, very wide up to ~2) and inversely proportional to size (headings can be 1). [p.122-125]
- In link-heavy UI, don't colour every link: use weight or a darker colour; for minor links, underline only on hover. [p.126-127]
- Left-align by default; centre only short blocks (two or three lines at most); right-align number columns; hyphenate justified text. [p.128-131]
- Leave letter-spacing alone, except: tighten wide-spaced fonts at headline sizes; loosen all-caps text. [p.132-135]

**Working with Color (p.137-169)**
- Author colours in HSL (hue, saturation, lightness), not hex, so related colours look related in code; not HSB. [p.138-141]
- A palette is greys (8-10, starting from a very dark grey rather than black), one or two primary colours (5-10 shades), and accent colours (red/yellow/green for status and others for categories, each with shades). A complex UI can need around ten colours at 5-10 shades. [p.142-147]
- Define shades once: pick the base (a good button background), the darkest (text) and lightest (tinted background), then fill 700 and 300, then the rest; nine steps (100-900) is a convenient size. Don't generate shades with `lighten()`/`darken()`; once in use, tweak by eye but rarely add. [p.148-151]
- Raise saturation as lightness moves away from 50%, or light and dark shades look washed out; rotate hue slightly (not past about 20-30°) towards brighter hues (60°, 180°, 300°) to lighten and towards darker (0°, 120°, 240°) to darken. [p.152-157]
- Tint greys toward blue for cool or toward yellow/orange for warm, with more saturation at the light and dark ends. [p.158-161]
- WCAG: 4.5:1 for normal text, 3:1 for large. White-on-colour needs surprisingly dark colours, so flip to dark text on a light tint; for coloured text on a dark panel, rotate the hue towards a brighter one. [p.162-165]
- Never use colour as the only signal: add icons or labels; in charts use contrast (light vs dark), not just different hues. [p.166-168]

**Creating Depth (p.171-197)**
- Light comes from above: raised things get a lighter top edge and a small, sharp shadow below; inset things get a darker top and a lighter bottom lip. Hand-pick the lighter edge colour. Don't chase realism. [p.172-179]
- Shadows express height: small for buttons, medium for dropdowns, large for dialogs; about five in a fixed set, growing roughly linearly; use them for interaction (lifted while dragged, smaller when pressed). Choose by "where does this sit on the z-axis". [p.180-185]
- Good shadows have two parts: a large soft one and a small tight dark one; the tight one fades to nothing at higher elevations. [p.186-189]
- Flat designs convey depth by tone (lighter = closer) and short blur-free shadows. [p.190-193]
- Overlap elements to make layers; give overlapping images a background-coloured border. [p.194-197]

**Working with Images (p.199-217)**
- Use good photos, never placeholders swapped later. For text over images, use an overlay, lower the image contrast, colourise, or a soft text shadow. Icons and screenshots have an intended size: don't scale small icons up or screenshots down. For user-uploaded images, crop to a fixed box with `cover` and use an inner shadow or semi-transparent inner border against background bleed. [p.200-217] Relevant to a workbench tool only if it shows thumbnails or avatars.

**Finishing Touches (p.219-247)**
- Supercharge defaults: custom bullets, branded checkboxes and radio buttons, styled links. [p.220-223]
- Accent borders (top of a card, side of an alert, short bar under a heading, active nav item) add colour cheaply. [p.224-227]
- Decorate backgrounds: a tone change, a gentle two-hue gradient (hues within ~30°), a low-contrast pattern or shape. [p.228-233]
- Empty states are a priority: an image or illustration, an emphasised action, and hide filters and tabs that do nothing yet. [p.234-237]
- Fewer borders: use shadows, adjacent background tones, or more spacing. [p.238-241]
- Standard components can be redesigned: richer dropdowns, merged table columns with hierarchy, selectable cards instead of radio buttons. [p.242-247]

**Leveling Up (p.249-252)**
- Notice decisions you wouldn't have made; rebuild favourite interfaces from scratch without peeking at the code to learn the small tricks. [p.250-252] Not applicable to the designer role as a procedure.

## Overlap with impeccable

Judged from the skill files in the template [REPO]: `SKILL.md`, `reference/craft-floor.md`, `operate.md`, `layout.md`, `typeset.md`, `colorize.md`, `distill.md`, `clarify.md`, `onboard.md`, `extract.md`, `document.md`, `shape.md`, `new-work.md`, `hooks.md`. The detector's own rule list is inside the engine binary, which is not in the template, so what it flags is `[UNVERIFIED]` here except for the rule names `hooks.md` mentions (`overused-font`, `bounce-easing`, `side-tab`).

| Book principle | In impeccable | Verdict |
|---|---|---|
| Start with a feature, not a layout (p.8) | `shape.md` asks for the job, the main action and success first; nothing about building the frame last | Covered differently; the workbench's own shape sketch does the rest [REPO `stack.md`]. Add one line to the designer brief |
| Detail comes later; greyscale first (p.12) | No greyscale stage. `new-work.md` fixes a visual world (palette, type) before code; `colorize.md` uses grey only as a diagnostic ("places where grayscale obscures hierarchy") | **Conflicts in order.** The workbench already follows the book for the shape (`design.md`: "No impeccable yet") |
| Don't design too much, cycles (p.16) | "Verify in bounded passes" (`SKILL.md`); refinement preserves | Covered differently; the workbench's milestone rule covers it |
| Choose a personality (p.20) | `new-work.md` world workshop; `document.md` "Creative North Star", "Overview voice" | Covered, heavier. The book's four levers are cheaper for a one-person tool |
| Systems in advance (p.28) | `layout.md`: "a documented spacing scale", 4-unit base; `distill.md`: "3-4 sizes maximum, 2-3 weights", "one spacing scale"; `operate.md`: fixed rem scale | Covered, but `extract.md` Step 1 says "If no design system exists, do not create one yet" and extracts only things used 3+ times. **Opposite timing**: the book defines first, extract waits. The starter's tokens settle it |
| Hierarchy: de-emphasise, weight/colour over size, last-resort labels, small section titles, icon/weight balance (p.36-59) | `layout.md` squint test; `distill.md` clear hierarchy; `typeset.md` "combine size, weight, space, and tone". Nothing on labels, titles in apps, or de-emphasising competitors; `operate.md` bans "heavy color or full-saturation accents on inactive states" only | **Missing**: the mechanics are not written down |
| No grey text on coloured backgrounds (p.42) | `craft-floor.md` Verify > Contrast: "On colored surfaces tint secondary text from that hue or the foreground; never gray"; `colorize.md` same; prefers explicit colours to translucent overlays | **Covered, same rule** |
| Action hierarchy, one primary (p.60) | `distill.md` "ONE primary action, few secondary, everything else tertiary"; `colorize.md` "Keep the primary action easy to find" | Covered. Destructive: book = secondary style plus a confirmation; `clarify.md` = "Prefer undo over confirmation when recovery is safe"; `operate.md` = "Modal as first thought" is laziness. **Mild conflict**; workbench resolution: backup or undo first, a confirmation only for irreversible acts, red only there |
| Too much white space first (p.66) | `craft-floor.md` Spacing: "tight groups, generous separation, more space above a heading than below it" | Covered in outcome; the start-generous procedure is missing |
| Spacing scale (p.70) | `layout.md`: "A 4-unit base usually provides the useful middle steps" | Covered differently. The book says a linear multiple-of-4 scale is not enough; **mild conflict** |
| Don't fill the screen; fixed sidebar; max-width (p.76-91) | `typeset.md`/`craft-floor.md` measure only; `layout.md` "container-aware components" | **Missing** for page widths |
| Ambiguous spacing, proximity (p.96) | `layout.md` Grouping: "Are related items close and distinct groups separated"; "Use proximity before adding containers" | **Covered** |
| Relative sizing doesn't scale (p.92) | `operate.md` "Fixed rem scale, not fluid"; "Responsive behavior is structural" | Covered, same direction |
| Type scale, hand-picked, no em (p.102) | `operate.md`: ratio "1.125-1.2 between steps is typical"; fixed rem | Covered differently. Book prefers a hand-picked scale over a ratio; no rule on nested em |
| Fonts (p.108) | `operate.md` "One family is often right", "System fonts" | Covered |
| Line length (p.114), line-height (p.122) | `typeset.md` "45-75ch", "line height inversely with measure"; `craft-floor.md` says 65-75ch | Covered (impeccable's two files differ: 45-75 vs 65-75). The book's second half, line-height falls as size grows, is missing |
| Baseline alignment, link styling, right-aligned numbers (p.118, 126, 130) | `craft-floor.md` "numerals in tabular data" (theme tabular figures) | Missing; tabular figures are complementary to right alignment |
| Letter-spacing (p.132) | `craft-floor.md`: tracking floor -0.04em, "-0.02 to -0.03em usually reads better"; bans a "kicker or eyebrow above a heading" | Covered for headings. **Conflict**: the book likes small tracked all-caps labels, which are the usual shape of a kicker. Resolution below |
| HSL (p.138) | `colorize.md`: "prefer OKLCH"; use the project's existing space | **Conflicts** on the format. The effect is the same, see note below |
| More colours than you think; 8-10 greys, 5-10 shades (p.142-151) | `colorize.md` "Build roles, not a bag of swatches"; `document.md` sidecar `tonalRamp` | Covered differently; the counts and the base/edges/fill-the-gaps method are missing |
| Saturation vs lightness; hue rotation (p.152) | `colorize.md`: "vary lightness and reduce chroma near white and black" | Looks opposite, isn't (note below); hue rotation missing |
| Tinted greys (p.158) | `colorize.md`: "Tint neutrals only when the brand hue genuinely creates cohesion. Neutral gray is valid"; `operate.md` "second neutral layer ... slightly cooler or warmer" | Covered differently: book tints by default, impeccable only when justified |
| Accessible colour, flipping contrast, not colour alone (p.162-168) | `colorize.md` contrast table, "Information conveyed by color also needs text, shape, iconography, or position"; `craft-floor.md` | **Covered**. "Flip the contrast" and hue-rotated text are missing |
| Light source, inset elements (p.172) | Not described; `craft-floor.md` Depth: "shadows carry an offset and a soft blur" | Missing, and not needed for flat office tools `[INFERENCE]` |
| Elevation system, two-part shadows (p.180, 186) | `document.md` "Shadow Vocabulary", "Elevation philosophy"; `craft-floor.md` "Declare elevation once, border or shadow" | Covered differently; the five-step set and the two-part recipe are missing |
| Flat depth with solid shadows (p.192) | `craft-floor.md` bans "Hard offset shadows (box-shadow: 4px 4px 0) outside a world that is actually neobrutalist" | **Conflicts** on blur-free shadows. The book's other flat-depth tool, tone (lighter = closer), is fine |
| Overlap layers (p.194) | Not covered | Missing, not wanted |
| Photos, overlays, intended size, uploads (p.200-217) | Persuade mode: "Ship real imagery"; image generation is switched off in the workbench | Mostly out of scope here |
| Supercharge defaults (p.220) | `craft-floor.md` "Browser surfaces": selection, caret, scrollbars, focus rings, from the palette | **Covered** |
| Accent borders (p.224) | `craft-floor.md` bans "A colored border-left or border-right above 1px on cards, list items, callouts, or alerts"; `hooks.md` names a `side-tab` rule | **Conflicts** on the side-of-alert and active-nav-side cases. Top-of-card and under-heading bars are not banned |
| Decorate backgrounds (p.228) | `craft-floor.md`: "Backgrounds are surfaces, textured only from the subject's world"; gradient text banned (not the same thing) | **Conflicts** on patterns; a tone change or gentle gradient is not banned |
| Empty states (p.234) | `onboard.md` "Empty State Design"; `operate.md` "Empty states that teach the interface"; `harden.md` | **Covered, more fully than the book** |
| Fewer borders (p.238) | `distill.md` "Eliminate borders, shadows, backgrounds that don't serve hierarchy or function"; "Remove unnecessary cards"; `craft-floor.md` the "ghost card" | **Covered** |
| Think outside the box (p.242) | `operate.md`: "Reinventing standard affordances for flavor" is a constraint; "earned familiarity" | **Conflicts** for standard controls. Merged table columns with hierarchy are compatible |

**Biggest overlaps** (nothing to add): contrast and tinted secondary text, one primary action, proximity grouping, measure, empty states, fewer borders and decorations, browser-surface theming.

**Biggest gaps** (the book adds): the hierarchy mechanics (chapter 2), page-width discipline, the colour-ramp method with counts, the five-step two-part shadow set, tokens-first as a starting step, baseline/right-align/link rules, "start generous".

**Conflicts to settle, and my suggested resolution:**
- *Accent borders vs the side-border ban.* Use a top bar on a card and a short underline; for an active nav item use a background tone plus weight, not a side stripe. No exception to the ban. `[INFERENCE]`
- *Blur-free shadows vs the neobrutalist-only rule.* Don't use them; use tone or the soft set.
- *All-caps tracked labels vs the kicker ban.* Allow tracked all-caps only for table column heads and small status tags; never above a heading.
- *HSL vs OKLCH.* I computed OKLCH chroma for the proposed ramp `[LOCAL]`: `hsl(215 95% 96%)` has chroma 0.017 and `hsl(215 78% 47%)` has 0.183. So even with the book's saturation boost the light end has far less chroma than the middle; both rules say the same thing in different colour spaces. Author the tokens in HSL (it is how the book states the rules and how a script can read them); a later switch to OKLCH is a mechanical rewrite.
- *Extract-later vs systems-first.* The starter ships the tokens; the designer adds a token only when a value is needed a second time; never creates a tool-specific system from scratch.
- *Greyscale first vs world first.* Greyscale first for tools (already workbench policy); impeccable's world choice only for websites people look at (already `design.md`).
- *Destructive acts:* backup or undo first (the workbench has dated backups), confirm only when irreversible, red only in the confirmation.

## Checkable by script

Two tiers. **Static** checks read the tool's CSS text and run anywhere offline. **Rendered** checks need computed styles from a loaded page; the detector already needs the built page [REPO `design.md`], and how to load the Electron window headlessly inside Codex's sandbox is not tested (`[UNVERIFIED]`, see Open questions).

I ran the static sketches below on the starter's `index.css` and on a deliberately bad sample `[LOCAL]` (throwaway code, not kept). Results:
- Starter: no off-scale spacing; sizes 16 and 20; 9 distinct colours, of which 5 (`#ffffff`, `#7a7a7a`, `#e6e6e6`, `#333333`, `#000000`) are typed in directly instead of using the four `:root` variables; 4 border declarations (toolbar, button, textarea, status bar) with the toolbar and status bar already on a panel tone; one radius. **The textarea border, `--line` `#bdbdbd`, is 1.88:1 against white.** A text box bordered by only that line misses the 3:1 rule for the visual cue of a control (WCAG 2.2 SC 1.4.11 asks 3:1 for the information needed to identify a control, with a text input's border given as the example [W3C Understanding 1.4.11]). Buttons with visible text are exempt from a border minimum, and the button border `#7a7a7a` is 4.29:1 anyway.
- Bad sample: flagged `margin-bottom:18px`, `padding:14px 22px`; three sizes (23, 17, 13); weights 300 and 500; `#999` on `#3b82f6` at 1.29:1.

```js
// shared: decls = [[prop,value],...] from /([a-z-]+)\s*:\s*([^;{}]+)[;}]/g over the stylesheet
const px = v => [...v.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map(m => +m[1]);
```

| # | Principle | Check | Sketch |
|---|---|---|---|
| 1 | Values off the spacing scale (p.70) | static | `SPACE=new Set([0,1,2,4,8,12,16,24,32,48,64,96,128,192,256,384,512,640,768])`; for props matching `margin\|padding\|gap\|width\|height\|top\|left`, flag each `px()` value not in SPACE `[LOCAL]` |
| 2 | Too many or off-scale font sizes (p.102) | static | collect `font-size` values and sizes in the `font:` shorthand; flag if more than 7 distinct, any not in the type scale, any under 14px |
| 3 | Weights (p.38) | static | collect `font-weight`; flag any value not in {400, 600}, or any under 400 |
| 4 | Contrast (p.162) | static + rendered | resolve token colours; `ratio = (L1+.05)/(L2+.05)` on relative luminance; text pairs below 4.5, large text below 3, text-input/control borders below 3 against the adjacent background `[LOCAL]` |
| 5 | Grey text on a coloured background (p.42) | rendered | for each text element: fg saturation < 10% and effective background saturation > 25% (walk up to the first non-transparent background), or `opacity` < 1 on text over colour; flag |
| 6 | Shade count per hue / hard-coded colours (p.148) | static | group hex and `hsl()` literals by hue bucket (grey = s<8%); flag more than 10 per bucket or any literal outside `:root` `[LOCAL]` |
| 7 | Border overuse (p.238) | static + rendered | count declarations matching `^border(-top\|-bottom\|-left\|-right)?$` that aren't `none`; flag more than about 1 per 3 components, or any border on an element whose background already differs from its parent's |
| 8 | Mixed radii (p.24) | static | distinct `border-radius` values (excluding `50%` / `999px` for pills); flag more than 2, or `0` mixed with non-zero |
| 9 | Shadows outside the set (p.182) | static | every `box-shadow` must be `none` or `var(--shadow-*)`; flag literals |
| 10 | One primary action per screen (p.60) | rendered | `document.querySelectorAll('button.primary:not([hidden])').length > 1` |
| 11 | Ambiguous spacing (p.96) | rendered | for each `label` followed by its field: `gapLabel = field.top - label.bottom`, `gapGroup = nextLabel.top - field.bottom`; flag if `gapLabel >= gapGroup` |
| 12 | Line length (p.114) | rendered | for each `p` with 3+ lines: `chars = width / (fontSize * 0.5)`; flag above 75 (or `max-width` over 35em) |
| 13 | Heading too big for an app screen (p.54) | rendered | h1/h2 computed size above 30px in a tool screen; flag |
| 14 | Line-height vs size (p.122) | rendered | `lineHeight/fontSize >= 1.5` on text of 24px or more; flag |
| 15 | Right-aligned numbers (p.130) | rendered | `td` whose text matches `^[-+$€]?[\d.,\s]+%?$` and `text-align` isn't `right`; flag |
| 16 | Tracking on all-caps (p.134) | static | `text-transform: uppercase` rules with no `letter-spacing` above 0 |
| 17 | Nested `em` font sizes (p.106) | static | any `font-size` in `em`/`%`; flag |
| 18 | Colour as the only signal (p.166) | partly | a status colour class used on an element with no text change or icon in the same rule set; weak signal, review by eye |

**Not checkable** (need the designer's judgement, or a person): whether the hierarchy reads at a squint, whether something is truly secondary, which label can be dropped, the feel of the radius/colour/words, whether the empty state tells the user what to do, whether spacing is "generous enough". The impeccable detector and its squint-test questions (`layout.md`) remain the second line.

Where the detector and this script may flag the same thing (contrast, grey on colour), the script runs first and the designer fixes both in one batch. Which rules overlap is `[UNVERIFIED]`.

## A starter design system

Derived from the book's rules and the starter's own values (4, 8, 12, 16 spacing; a 16px/1.5 body; a 20px heading; one 4px radius; 3px outline). Colour values are computed and contrast-checked `[LOCAL]`; the rest are my choices.

**How it fits "greyscale first, look later".** Every colour used by a component is a *role* (`--text`, `--action`, `--border-control`), and roles point at the grey ramp. A new tool is built, sketched and demoed in greys only. The "look" step changes values in two places in the same `:root` block: (1) the ten greys get a slight blue tint (same lightness, so contrast barely moves; re-run the contrast check), (2) the `--action`, `--focus` and `--link` roles are re-pointed from grey to the primary ramp. Component CSS does not change. Sketches that embed the tool's `index.css` get the same look automatically [REPO `stack.md`].

```css
:root {
  color-scheme: light;

  /* Space and size. Base 16px; steps at least ~25% apart (the small end packed, the large end spread). */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-6: 24px;  --space-8: 32px;  --space-12: 48px; --space-16: 64px;
  --space-24: 96px; --space-32: 128px;
  --w-sidebar: 256px;  --w-form: 512px;  --w-content: 768px;   /* fixed widths for layout; data views flex */

  /* Type. System sans. Sizes by role; no 12px, no sizes between the steps. */
  --font: 'Segoe UI', system-ui, sans-serif;
  --text-sm: 14px;   /* secondary: hints, table captions, status bar */
  --text-base: 16px; /* body, inputs, buttons, table cells */
  --text-lg: 20px;   /* screen and dialog titles */
  --text-xl: 24px;   /* rare: one big title or number */
  --text-2xl: 30px;  --text-3xl: 36px;  /* hero numbers only */
  --weight-normal: 400;  --weight-strong: 600;   /* nothing lighter than 400 */
  --lh-tight: 1.2;  /* text >= 24px */   --lh-base: 1.5;  /* body */
  --measure: 65ch;  /* paragraphs */
  --tracking-caps: 0.05em;  /* all-caps text only */

  /* Greys: 10 steps. Start true grey (saturation 0); the look step swaps in the tint column. */
  --grey-50:  hsl(0 0% 97%);   /* tint: hsl(220 25% 97%) */
  --grey-100: hsl(0 0% 94%);   /*       hsl(220 22% 94%) */
  --grey-200: hsl(0 0% 87%);   /*       hsl(220 18% 87%) */
  --grey-300: hsl(0 0% 76%);   /*       hsl(220 14% 76%) */
  --grey-400: hsl(0 0% 54%);   /*       hsl(220 10% 54%) */
  --grey-500: hsl(0 0% 41%);   /*       hsl(220 10% 41%) */
  --grey-600: hsl(0 0% 34%);   /*       hsl(220 12% 34%) */
  --grey-700: hsl(0 0% 27%);   /*       hsl(220 15% 27%) */
  --grey-800: hsl(0 0% 19%);   /*       hsl(220 20% 19%) */
  --grey-900: hsl(0 0% 12%);   /*       hsl(220 25% 12%) */

  /* Roles (components use only these) */
  --surface: #fff;                 --surface-sunken: var(--grey-100);   --surface-hover: var(--grey-200);
  --text: var(--grey-900);         /* primary   */
  --text-2: var(--grey-600);       /* secondary */
  --text-3: var(--grey-500);       /* tertiary; still >= 4.5:1 on white and on grey-100 */
  --border: var(--grey-200);       /* dividers only */
  --border-control: var(--grey-400);   /* inputs, outlined buttons: >= 3:1 on white */
  --action: var(--grey-800);  --action-hover: var(--grey-900);  --on-action: #fff;
  --focus: var(--grey-900);   --link: var(--text);

  /* Radius: one per tool (the feel); pills only for small tags */
  --radius-sm: 4px;  --radius-md: 8px;  --radius-full: 999px;
  --radius: var(--radius-sm);

  /* Elevation: five steps, two-part (large soft + small tight); the tight part fades with height. */
  --shadow-color: 0 0% 12%;    /* look step: 220 25% 12% */
  --shadow-1: 0 1px 2px hsl(var(--shadow-color) / .16);                                        /* button */
  --shadow-2: 0 2px 4px hsl(var(--shadow-color) / .08), 0 1px 2px hsl(var(--shadow-color) / .14);   /* card */
  --shadow-3: 0 6px 12px hsl(var(--shadow-color) / .10), 0 1px 3px hsl(var(--shadow-color) / .10); /* dropdown */
  --shadow-4: 0 12px 24px hsl(var(--shadow-color) / .12), 0 2px 4px hsl(var(--shadow-color) / .06); /* dialog */
  --shadow-5: 0 20px 40px hsl(var(--shadow-color) / .14), 0 2px 4px hsl(var(--shadow-color) / .02); /* dragged */

  /* Borders and opacity */
  --border-w: 1px;  --border-w-strong: 2px;  --opacity-disabled: .4;
}
```

Look-step additions (not in the greyscale starter, written into the tool's `:root` when colour is chosen). Primary: one hue, ten shades; saturation rises toward both ends, base 500, button background 600:

| Shade | HSL | Hex | Contrast with white |
|---|---|---|---|
| 50 | `215 95% 96%` | `#ebf3fe` | 1.12 |
| 100 | `215 90% 92%` | `#d8e8fd` | 1.25 |
| 200 | `215 85% 84%` | `#b4d0f9` | 1.57 |
| 300 | `215 80% 72%` | `#7eaef1` | 2.28 |
| 400 | `215 78% 58%` | `#4086e7` | 3.63 |
| 500 | `215 78% 47%` | `#1a68d5` | 5.25 |
| 600 | `215 80% 40%` | `#1458b8` | 6.71 |
| 700 | `215 82% 32%` | `#0f4695` | 8.98 |
| 800 | `215 86% 24%` | `#093472` | 11.99 |
| 900 | `215 90% 16%` | `#04234e` | 15.55 |

Roles then become: `--action: primary-600`, `--action-hover: primary-700`, `--focus: primary-600`, `--link: primary-700` (on `primary-100`, 700 is 7.20:1 and 600 is 5.38:1). Status colours, five shades each (tint, soft, solid, text, strongest); "solid" is a background for white text, "text" goes on the tint:

| Role | 100 (tint) | 300 | 500 (solid) | 700 (text on 100) | 900 |
|---|---|---|---|---|---|
| Danger (hue 0) | `#fce8e8` | `#f2a6a6` | `#ca2121` (white 5.60) | `#8f1414` (7.83 on 100) | `#5c0a0a` |
| Warning (hue ~40) | `#fef4d7` | `#f9d66c` | `#e99f0c` (dark text on it: use 900, 6.13) | `#834907` (6.55 on 100) | `#492404` |
| Success (hue 145) | `#dff6e9` | `#94dbb2` | `#1b7942` (white 5.44) | `#115f32` (6.83 on 100) | `#073c1d` |

Greys, checked: with the true-grey ramp, `--text-3` (grey-500) is 5.53:1 on white; `--border-control` (grey-400) is 3.47:1 on white; `--text-3` on grey-100 is 4.84. With the tinted ramp (`hsl(220 …)`) the same pairs are 5.86 / 3.66 on white, and 5.08 for `--text-3` on grey-100 `[LOCAL]`. The status and primary tables are tinted by design.

**What changes in the starter's `index.css`:**

| Today | Becomes |
|---|---|
| `--ink: #1f1f1f` | `--text` (grey-900, same value) |
| `--muted: #595959` | `--text-2` (grey-600, `#575757`) |
| `--line: #bdbdbd` (also the textarea border, 1.88:1) | `--border` for dividers; `--border-control` (grey-400) for the textarea and outlined buttons |
| `--panel: #f2f2f2` | `--surface-sunken` (grey-100, `#f0f0f0`) |
| literals `#ffffff`, `#7a7a7a`, `#e6e6e6`, `#333333`, `#1f1f1f`, `#000000` | `--surface`, `--border-control`, `--surface-hover`, `--action`, `--action-hover`, `--focus` |
| padding/gap 4, 8, 12, 16 | `--space-1/2/3/4` (the same values) |
| `font: 16px/1.5`, `h1 { font-size: 20px }` | `--text-base`, `--lh-base`, `--text-lg` |
| `.label` and `.status` at 16px in a muted grey | `--text-sm` + `--text-2` (a size step as well as colour; see Open questions) |
| `border-radius: 4px` | `var(--radius)` |
| toolbar bottom border and status top border | removed; the sunken tone separates them (p.240) |

Not proposed: dark mode (the book does not cover it); a second primary colour; icon sizes beyond 16/24/32 `[INFERENCE]`; any dependency or build step.

## What the designer's DESIGN.md should hold

Short; it is the designer's only memory of the tool, together with the screens map and the model's summary. The headings are chosen so impeccable's `document` step can read and regenerate it later: Feel is its Overview; the token notes are its Colors/Typography/Layout/Elevation/Shapes; Screens is its Components [REPO `document.md`]. The designer fills in `document`'s qualitative questions itself; the workbench never asks them (`design.md`).

```markdown
# <Tool name>: design
Feel: <one line from PRODUCT.md, the user's words>. Type: system sans. Colour: <grey | blue>. Corners: <4px | 8px>. Words: <plain | friendly>.

## Screens (most important first)
### <Screen name>: the one thing it is for: <main action, in the user's words>
- Most important: ... Secondary: ... Quiet: ...
- Actions: main = <button> (solid) / next = <button> (outline) / rare = <link>
- Empty: <the sentence the user sees and the one action>
- Feel of density: calm | dense (<why, e.g. 40 rows must fit>)

## Differs from the starter tokens
<only the differences: the primary hue, the radius, a changed role; nothing else>

## Rules this tool follows
- Do/Don't, at most 8 lines, each from something decided or something the user said.

## Decided, and why
- <date> <decision in a line> (<user's words if any>)

## Later (not designed yet)
- <nice-to-haves parked>
```

**What the designer returns to the conversation role** (never to the user directly):
1. What changed in the user's words, at most 3 lines ("the totals stand out and the two buttons are easier to tell apart").
2. The path to the sketch or the changed screens.
3. At most one question for the user, with the designer's own recommendation, phrased about their work (never about colour, type or layout choices), or "none".
4. Notes for the implementer: which files and tokens change, and anything that needs code (a new control, a screen state).
5. A one-line check summary for the conversation role only: script findings fixed, left, and why. No scores, rule names or design terms ever reach the user.

## Fit with the users

- **One person or a few colleagues, desktop windows.** Most of the book is about products with many screens and many readers. The chapters that pay off here are hierarchy, spacing, text, a small colour set, borders, and empty states. Skip phone-first, responsive em tricks, photos, overlaps and pattern backgrounds (rec. 12). Check the window at its default size and maximised, never phone widths [REPO `design.md`]; "don't fill the screen" matters here because a maximised window is much wider than a form needs: cap forms at `--w-form` and prose at `--measure`.
- **Not developers, no jargon.** The designer's vocabulary (hierarchy, tokens, elevation, tracking) stays in DESIGN.md and the scripts. To the user it becomes effects: "easier to see what to do first", "quieter secondary buttons". Colour and type questions are never asked; the nearest allowed question is "does this feel right?" after a demo.
- **Office tools are often dense** (tables, lists). The book allows dense layouts as a deliberate choice (p.69). The designer records density per screen in DESIGN.md; the default for a form or single-purpose tool is airy.
- **Fewer decisions for the user, none for the designer to re-make.** Tokens make the look a few choices made once, which matches the project's "minimise decisions" principle `[INFERENCE]`.
- **Plain by default is fine.** The starter's greyscale already reads well; the point of the system is consistency and a clear first thing to do, not decoration. Colour is a small step, not a design project.

## Open questions

- **Text size floor.** The starter comment says "Keep font sizes at 16px or more"; the proposal adds a 14px secondary step (still with a contrast of at least 4.5:1). Impeccable allows 16px as a floor "unless a dense role ... justifies otherwise" [REPO `typeset.md`]. It is the author's call whether readability for this audience outweighs the hierarchy gain; if 16 stays the floor, secondary text is distinguished by colour and weight only and `--text-sm` is dropped.
- **Side stripe and other conflicts.** I propose no exception to impeccable's ban on coloured side borders, blur-free shadows or kicker labels. If the author wants the book's accent-border look, the detector rule `side-tab` would need a file-scoped ignore [REPO `hooks.md`].
- **Where the script runs.** The static checks work on CSS text with no browser. The rendered checks need a page loaded with its styles; I did not test how to do that for the Electron window or the one-file HTML inside Codex's sandbox, with no ports. The detector already runs on the built page, so the same entry points exist.
- **HSL vs OKLCH.** HSL was chosen for scripts and for the book's rules; impeccable prefers OKLCH for new palettes. Not tested what the detector says about HSL tokens.
- **Tools already built from the old starter** have `--ink`, `--muted`, `--line`, `--panel` in their own stylesheets. The proposal is a clean cutover for new tools; migrating existing tools is a separate change (not evaluated).
- **The book's own figures.** I could not read the values of its scales (figures). If the author wants the proposal to match the book exactly, the spacing, type and shadow figures on p.73, 105 and 183 need to be compared by eye.
- **No behaviour test.** Nothing here has been run through Codex, so I do not know whether the designer follows the rules or whether they improve the result. Note 13's two-pass test on the "reading log" tool is the model: same request with and without these rules, detector counts compared. Also untested: a dark theme, and the roles on a website.
- **Language and personality.** The book counts the words as part of the feel (p.25); in the workbench, wording belongs to the conversation role and `CONTEXT.md`. The split between what the designer may rewrite (labels, empty-state sentences) and what the conversation role owns is not decided here.

## Sources

[1] Adam Wathan and Steve Schoger, *Refactoring UI*, the author's own PDF copy (`Documents/Reading List/Refactoring UI (Adam Wathan, Steve Schoger).pdf`), read in full through the text layer on 2026-10-01. Page numbers are the PDF's, equal to the printed numbers. Chapters used: "Starting from Scratch" (p.7-33); "Hierarchy is Everything" (p.35-63); "Layout and Spacing" (p.65-99); "Designing Text" (p.101-135); "Working with Color" (p.137-169); "Creating Depth" (p.171-197); "Working with Images" (p.199-217); "Finishing Touches" (p.219-247); "Leveling Up" (p.249-252). The text layer lacks figure content and parts of pages 1 and 3-5 (the table of contents was readable).
[2] Repository, `skills/workbench-setup/template/.agents/skills/workbench/design.md` and `stack.md` ("Sketches") [REPO].
[3] Repository, starter stylesheet `skills/workbench-setup/template/.agents/skills/workbench/starters/electron/src/index.css` [REPO].
[4] Repository, impeccable 4.4.0 in `skills/workbench-setup/template/.agents/skills/impeccable/`: `SKILL.md`, `reference/craft-floor.md`, `operate.md`, `layout.md`, `typeset.md`, `colorize.md`, `distill.md`, `clarify.md`, `onboard.md`, `extract.md`, `document.md`, `shape.md`, `new-work.md`, `hooks.md`, `quieter.md` [REPO].
[5] [13-design-impeccable.md](13-design-impeccable.md) (why impeccable is bundled, test method) and [11-data-diagrams.md](11-data-diagrams.md) (house style; save-script rule for new scripts).
[6] W3C, "Understanding Success Criterion 1.4.11: Non-text Contrast", https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html (opened 2026-10-01). 3:1 against adjacent colours for the visual information needed to identify a UI component; a text input's border is given as an example that must meet it; a button whose visible text identifies it needs no border contrast.
[7] Local computations (2026-10-01, Bun, throwaway): WCAG relative-luminance contrast for the grey, primary and status tables; OKLCH chroma for the HSL examples; the static CSS checks on the starter and a bad sample.
