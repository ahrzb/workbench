# Showing 2–3 Alternative Mockups Before Building Each Feature

Scope: evidence and rules for the "before each feature, show 2–3 alternative designs; she picks" step, for a non-programmer user, a fixed stack, no-admin install, local-first. Research only.

## Recommendations

1. **Use alternatives only for real structural forks.** Show 2–3 mockups when the feature has a genuine choice in layout, flow or interaction model. If one conventional pattern obviously fits (list plus "add" button, one field more, one column reordered), skip mockups and build the smallest version. Parallel design is costly, is "not recommended for all projects", and NN/g says to design "just the top features" [33][3]. Mockups must not become a second build trap. [INFERENCE from 3, 33]

2. **Always show more than one. Default to 3 for interaction-model forks and 2 for smaller forks.** Users shown a single design rate it higher and criticise it less, and none of 36 rejected it. Shown three, they criticise more and 3 of 12 explicitly rejected one [2]. Parallel prototyping also gave better results, more divergence and a bigger confidence gain, most of all for novices [1]. Do not exceed 3. NN/g's ceiling for professionals is 3–5 and users fatigue after 2–3 [3]. Show the fewest options that still span the fork. Never show one "polished suggestion" plus a token alternative.

3. **Make the options differ in how she would *use* the thing, not in how it looks.** Freeze colour, fonts, chrome, vocabulary and sample data across options. Vary one named dimension (two at most): layout, flow/steps, interaction model, information density, or what is automated versus manual (section "What alternatives should differ on"). Tohidi's three options were functionally identical but differed in interaction style (round dials, drop-down table, linear sliders) [2]. Options that vary on the same attribute ("alignable") are easier to compare than options that each add different features [12]. AI-generation tools default to varying style: Stitch's "aspects to vary" list includes colour, font and images [22]. Google's Design Variations offers "different aesthetic choices" [23]. Override this.

4. **Force real divergence; do not trust one pass to produce it.** Assign each option a different value on the chosen dimension before generating, then check "would she do the task differently in A vs B?" Generative UI tools converge in layout and visual appearance [16], and AI-generated examples increased fixation on the first example in a controlled study (N=60) [14]. Without an explicit dimension the options will be near-duplicates. Also ask for her own mental picture first (one sentence or a napkin sketch) and add it as an option if it differs, so the AI's first idea does not anchor her. [INFERENCE from 14]

5. **Name each option by its difference, in her words.** "A: everything on one sheet, like your Excel file", "B: one question at a time", not "master-detail" or "wizard". Never expose terms outside the shared vocabulary. Options with many attributes or several screens overwhelm people. Professionals in the GenUI study struggled with "3 questions × 4 options" and "too technical … text-heavy" cards [4][12].

6. **Render each option as one key screen (the screen she will live in), plus a one-line flow.** For step-based options add at most 3–4 small step panels in a row. Each design spanning many screens was the main pain point for previews in the GenUI study [4]. NN/g: parallel versions need not cover everything, "just the top features", at "rough wireframe" level [3].

7. **Rank of mockup formats (default choice first):**

| Rank | Format | Use when |
|---|---|---|
| 1 | Static, self-contained HTML "sketch" (greyscale, her real data), all options in one file, opened in her default browser | Default for almost every feature |
| 2 | Same file with minimal JS clicks | Only when the difference can't be judged statically (multi-step flow, drag-drop, live filter) |
| 3 | Throwaway page rendered with the real app's own components and her data | Second and later features, once the app exists |
| 4 | ASCII/text wireframe in chat | Fallback when a browser can't open; ≤5 elements per option |
| 5 | SVG wireframe | Not recommended: not honest to the stack |
| 6 | Mermaid flow diagram | Only for a pure ordering-of-steps question, and only if she asks for a diagram |
| 7 | Prose-only description | Never alone; always the caption under a visual |

   Details and evidence in "Key evidence → Formats (R7)" below [4][6][11][17].

8. **Style the sketch to look like a sketch, but not crude.** Use grey boxes, system font, dashed borders and a visible "SKETCH — not the real app" banner. Buxton's sketch attributes include a "clear vocabulary" that signals "this is a sketch", "minimal detail", and a refinement level that does not suggest more certainty than exists [7]. Users do judge formal-looking designs as "finished and unchanging" [8], and evaluation of early designs "can mute creative ideas" [30]. Polish also triggers the aesthetic-usability effect, where attractive designs are judged more usable [19]. But do not go so crude that it feels like a letdown: in the 2026 GenUI study professionals rated low-fi lower on "matched my needs" (p<.01) and called it "uninspiring" [4]. Controlled studies show no difference in issues found between low- and high-fidelity [5], so treat sketch styling as a cheap hedge, not a proven necessity. Target: neutral, tidy layout, low visual fidelity, real content.

9. **Fill mockups with her data and vocabulary, not lorem ipsum.** Use 5–10 real-looking rows built from her own files, names and terms (with her permission and only locally). NN/g defines fidelity on three axes (interactivity, visuals, content) [6]. McCurdy et al. add "data model" as a separate axis and argue for mixed fidelity [11]. The recommended mix is low visual, high content, low-to-medium interactivity. Evidence that real content improves feedback is practitioner opinion; no controlled study found [31]. Rationale: she can judge "does this row look right?" only with her own rows. Also serves the ontology check: wrong words surface immediately. [INFERENCE]

10. **Keep mockups honest to what the stack can build.** (a) Build the mockup in the final UI technology (HTML/CSS if the app is a webview or local web UI) with the same component vocabulary. (b) The AI must confirm each option is buildable in the chosen stack before showing it, and show only features that will ship in this iteration. (c) Verify by building, not by stated rationale: in a 120-interface benchmark, >25% of a UI tool's stated design rationales, and 34% for functional requirements, were not implemented [16]. (d) If the stack is not HTML-rendered (native toolkit, terminal), do not use HTML mockups that promise widgets the toolkit lacks; fall back to rank 3 or 4. [INFERENCE from 16; depends on the stack decision]

11. **Present side by side, with a one-line tradeoff each, and allow mixing.** Template below. Put the options in one view so she can compare directly. Comparing examples helps people extract principles [1]. NN/g's goal is a merged design, not a winner: picking the best of four gave +56%, merging gave +70%, and one more iteration +152% (usability measure vs average of originals) [3].

12. **Ask for reactions and problems, not designs.** Ask her to run one real task from her week through each option and say what bugs her. In Tohidi, seeing three designs did not produce more substantial suggestions ("usability testing … is a means to identify problems, not provide solutions"), because novices lack the language and hesitate to step into expert territory [2]. Explicitly offer "none of these" and rotate/mark option order as arbitrary, because first-seen versions bias later ones [3][2].

13. **Give the recommendation last, once, labelled as a default.** Choice overload is reduced when a dominant option is available and preference uncertainty is low [12]. She is a novice with high preference uncertainty, so a clear default helps. But users withhold criticism to please the designer [2], so show the options neutrally, ask the open question first, then add "If you have no strong feeling, I'd start with B because …". Whether an AI recommendation suppresses critique is untested [INFERENCE].

14. **Log the decision.** Record chosen option, rejected options, and one-line reason in a small project file (in her vocabulary). This prevents re-litigating and is cheap. [INFERENCE]

## Key evidence

### Why alternatives (R2, R3, R11)
- **Dow et al. 2010 (TOCHI)** [1]: 33 novices designed banner ads. Parallel condition (3 prototypes, feedback, 2 more) vs serial (5 in series, feedback each) with equal time and prototypes. Parallel: click-through 445.0 vs 397.9 per million impressions, expert rating 24.4 vs 21.7 of 50, higher divergence (similarity 2.78 vs 3.25), self-efficacy +2.5 vs +0.4. Novices: +2.9 vs −0.73. 8/17 serial participants described feedback as negative vs 0 parallel. Caveats: students, banner ads, scripted critique, modest effect sizes. It tests people *making* prototypes, not *choosing* among AI-made ones. That transfer is inference.
- **Tohidi, Buxton, Baecker, Sellen 2006 (CHI)** [2]: 48 participants, paper-prototype thermostat UI. Same design rated higher alone than in a group of three (Circular 9.08 vs 8.13, p=.004; Linear 7.92 vs 6.89, p=.014; Tabular n.s.). Fewer positive comments in the group. Linear (worst design) drew 5.08 vs 1.92 negative comments (p=.036). Zero of 36 single-design users rejected a design; 3 of 12 multi-design users did. No increase in substantial suggestions (H3 failed). The familiar Tabular version was rated easiest, yet "arguably the least appropriate": familiarity biases choice, so the AI should name that tradeoff. Options differed by interaction style (dials/table/timeline), which is the model for R3.
- **NN/g** [3][33]: parallel design means "multiple alternative designs at the same time"; min 3, max ~5; 1996 study figures as in R11; run cheaply at rough-wireframe level; "not recommended for all projects" (older 2014 article) [33].
- **Buxton** [7]: sketches are "plentiful", exist "in the context of a collection", and "suggest and explore rather than confirm".

### How many options (R2, R5, R13)
- **Choice overload literature is about large assortments** (Iyengar & Lepper: 6 vs 24 jams; 6 vs 30 essays/chocolates) [12]. **Scheibehenne et al. 2010** meta-analysed 50 experiments and found the effect hard to replicate, with no reliable conditions identified [13]. **Chernev et al. 2015** (99 observations, N=7,202) argue that with moderators the effect is real: it grows with choice-set complexity, task difficulty (number of attributes per option), preference uncertainty (novices) and effort-minimising goals [12]. Alignable attributes and a dominant option reduce it [12]. Browsing vs choosing goals also matter [12].
- **Implication**: 2–3 options are far below the sizes studied. The real overload risk here is *per-option complexity* and *novice preference uncertainty*, so keep each option to one screen, few attributes, and differ on one aligned dimension. Support: in GenUI, the burden was the number of dimensions/screens per idea, not option count [4].
- **AI generation tools** default to 3 variations (Stitch) and expose "creative range" (Refine/Explore/Reimagine) [22][21]. A tech-news summary of Stitch/AI Studio says "usually two to three options" [23] (secondary source).

### Fidelity (R7, R8, R9)
- **Walker, Takayama, Landay 2002** [5]: 28 non-developers; low- vs high-fidelity, paper vs computer. No significant difference in number or severity of usability issues; only 10% of issues concerned aesthetics; the few aesthetic comments were on the *low*-fidelity versions. Authors: choose by practical cost.
- **Hong et al. 2001** [8] (abstract only): users believe formal representations are finished but this did not change the level of detail of their suggestions; informal designs shown electronically raised expectations and drew lower-level visual suggestions.
- **Sefelin et al. 2003** [9]: paper vs computer low-fi elicited "almost the same quantity and quality of critical user statements" (quote from a secondary citation, [UNVERIFIED] at primary level).
- **Rudd, Stern, Isensee 1996** [10]: low-fi is good early for requirements and quickly generating alternatives, weak for detailed usability (abstract-level summary [UNVERIFIED] beyond that).
- **NN/g (Pernice)** [6]: low-fi puts less pressure on users, designers feel "less wedded", stakeholders know it isn't finished; high-fi looks like live software so behaviour is more realistic.
- **Chen et al. 2026 (arXiv preprint, N=24)** [4]: breadth-first generation rated higher for comparing alternatives (W=28.0, p<.01); high-fi rated higher for stage-fit (W=24.5, p<.01). In depth-first, high-fi Stitch use, "no one started over with a new prompt", and UX designers reported being "framed … into focusing on visual refinement" instead of "flow and whether the right information is placed". Caveats: preprint, professionals from one company, not novices.
- **Aesthetic-usability effect** [19]: attractiveness raises perceived usability and forgiveness of minor problems; polish can mask structural problems.
- **GenAI cost argument** [29] (Interactions 2026; page blocked, snippet only [UNVERIFIED]): classic low-fi advantages assumed polish signals effort; AI breaks that correlation. Read this together with Walker [5] and Chen [4]: the case for low-fi is now about *decision quality*, not cost.
- **Balsamiq's sketchy style** [28] is intentional: "don't get hung up on details"; "version 3" heuristic. Practitioner opinion, not evidence.

### Formats (R7)
- **Static HTML**: cheapest visual format for an LLM to produce reliably; opens in her existing browser with no install; can share CSS with a web-technology final app. [INFERENCE]
- **ASCII**: LLMs read ASCII layouts well but write them poorly ("Read-Write Asymmetry") [17]. ASCIIEval: best model 42.77% on recognition of ASCII art [18]. Practitioners report misaligned diagrams past ~5 elements [32]. Also unfamiliar to non-designers and monospace box-drawing may not render well in every Windows terminal [INFERENCE].
- **SVG**: MindSpan chose SVG because HTML "tends to resemble polished, high-fidelity screens" [4]. That is a real argument, but SVG shares no code with the final app; fix polish with CSS instead.
- **Mermaid/flow diagrams**: NN/g notes flowcharts "don't show any UI design" and that new specification formats are hard for stakeholders ("What's old is usually familiar") [20]. Mermaid also needs a renderer (terminals show raw text) [INFERENCE].
- **AI builder patterns**: Stitch: 3 variants by default, creative-range slider [22]; Figma: agent generates layout/theme/responsive variations on a shared canvas [25]; v0: multiple UI options per prompt (2024 secondary) [27]; Lovable: Plan mode asks clarifying questions, including sample vs live data, before building [26]; Claude Design (Apr 2026): design explorations, interactive prototypes, handoff to Claude Code [24]. All are cloud/account tools (see conflicts), but the patterns to borrow are: side-by-side, generate-N, choose which aspects vary.

### Honesty (R10)
- **Design Theater** [16]: five generative-UI tools, 120 interfaces: >25% of stated rationales not implemented; 34% of functional requirements; convergence in layout across tools. Stated "this option supports X" is not evidence that X works.
- **Buxton/Lawson** [7]: a drawing should not "show or suggest answers to questions which are not being asked".

## What alternatives should differ on

Given fixed technology, vary structure, one dimension per decision. Table of dimensions with example option names in her terms:

| Dimension | Example fork (name each in her words) | Note |
|---|---|---|
| Layout / what is visible at once | "Everything on one sheet" vs "list on left, details on right" | Cheapest to judge statically |
| Flow / steps | "One form" vs "one question at a time" | Show 3–4 step panels [4] |
| Interaction model | Table vs form vs drag-and-drop vs calendar vs chat | Tohidi's dial/table/timeline is the archetype [2] |
| Information density | "Just today's items" vs "everything with filters" | Ties to her real data volume |
| Automated vs manual | "App fills it in, you confirm" vs "you type it" | [INFERENCE]; must be buildable in the stack |
| Entry point | Opens on a list vs opens on "add new" | [INFERENCE] |

MindSpan and Luminate both enumerate *design dimensions* first and then options per dimension [4][15]; this skill should do the same silently: pick the dimension that matters for this feature, then write one option per value. Do not vary style. In Stitch-like tools the visual axes are on by default [22].

Ground options in her real task. The GenUI paper's professionals felt structural questions ("flow and whether the right information is placed") were the ones that mattered but were pulled to look-and-feel by polished output [4].

## Presentation template (chat message)

```
Before I build "<feature in her words>", here are 3 rough sketches. They're grey on
purpose — I want to know which way of working fits you, not how it looks.
Open: mockups/<feature>.html  (I've opened it for you; it works offline and has your
real <rows/names> in it).

  A — <name by difference, her words>     Good: <1 line>   Watch out: <1 line>
  B — <name by difference>                Good: ...        Watch out: ...
  C — <name by difference>                Good: ...        Watch out: ...

Try this: pretend it's <one real task from her week>. Which one gets you done fastest?
What's the first thing that would bug you in each? "None of these" is a fine answer,
and mixing is welcome ("A's list with C's ...").

If you've no strong feeling, I'd start with <B> because <one reason>.
```

File conventions: one HTML per feature decision, options stacked or tabbed with identical chrome, greyscale, system fonts, "SKETCH — not the real app" banner, her sample data from local files only, **no external requests (no CDN scripts, web fonts, analytics)** so nothing leaves her machine [INFERENCE], opened with the OS default-browser command (`start` on Windows, `open` on macOS) without administrator rights [UNVERIFIED as no doc was consulted; standard OS behaviour].

## Open questions and disagreements

- **Does low visual fidelity really yield better *structural* feedback?** Folk wisdom (Balsamiq, Buxton, NN/g) says yes [28][7][6]. Controlled studies mostly find no difference in issues found and few aesthetic comments in either condition [5][8][9]. The strongest evidence is for *multiple alternatives*, not for low fidelity per se [2][1]. The 2026 GenUI study finds professionals prefer high-fi even though depth-first hi-fi drew look-and-feel focus [4]. Treat "grey and sketchy" as a low-cost hedge, not a proven necessity.
- **AI weakens the cost signal** of polish [29], so the honest argument is anchoring and commitment, which is untested for non-designers.
- **Transfer gaps:** Dow tests makers of prototypes; Tohidi tests task-based paper testing with students; neither tests novices choosing among LLM-generated alternatives for their own tool. No study found on that exact case.
- **Recommend-one vs stay neutral:** dominant-option evidence supports recommending [12]; the social-desirability evidence supports neutrality first [2]. R13 is a compromise, untested.
- **Choice-overload results conflict** [13] vs [12]; both are about far larger assortments than 2–3.
- **Static vs clickable:** NN/g lists benefits of interactive prototypes (realistic behaviour, workflow testing) [6]; but building them costs more, and Walker found paper vs computer medium equal on issues found [5]. Where to switch is a judgement call.
- **Familiarity bias:** in Tohidi, the familiar table version was rated easiest but judged least appropriate [2]. Whether an AI should steer non-designers away from the familiar option is unresolved.

## Conflicts with the guiding principles

- **Avoid the build trap:** the mockup step adds work before every feature. NN/g says parallel design is costlier and not for all projects [33][3]; professionals in the GenUI study found breadth-first slower with more back-and-forth and some preferred depth-first for speed [4]. Mitigation is R1 (skip for trivial forks), one screen per option, and a time-box. If she gets impatient, the evidence favours building the recommended option and iterating.
- **Local-first / no accounts:** the AI mockup tools with best-documented variant workflows (Stitch, Figma, v0, Lovable, Claude Design) are cloud, account-bound and in some cases paid [22][25][24][27][26]. Do not send her to them; only borrow their patterns. HTML mockups must load nothing external.
- **Hard no-admin requirement:** static HTML and browser opening need no install. Renderers for Mermaid, or browser automation for screenshots, may require downloads. Not checked; avoid recommending them. [UNVERIFIED]
- **Bias to desktop apps / stack first:** R10's "same UI tech" honesty holds cleanly only if the final UI is HTML-rendered (webview/local web). For native toolkits or terminal UIs, HTML mockups can mislead. Depends on the stack decision made elsewhere.
- **Ontology first:** compatible and reinforcing, but names like "wizard", "master-detail", "kanban" are jargon; option names must use her vocabulary (R5).
- **User never chooses technology:** no conflict; the fork is about use, not tools.

## Sources

[1] Dow, Glassco, Kass, Schwarz, Schwartz, Klemmer. *Parallel Prototyping Leads to Better Design Results, More Divergence, and Increased Self-Efficacy.* ACM TOCHI 17(4), 2010. https://www.cs.cmu.edu/~spdow/files/PrototypingParallel-TOCHI10.pdf — opened; RCT-style evidence for parallel prototyping.
[2] Tohidi, Buxton, Baecker, Sellen. *Getting the Right Design and the Design Right: Testing Many Is Better Than One.* CHI 2006. https://www.billbuxton.com/rightDesign.pdf — opened; single vs three alternatives, critique and rejection effects, no gain in substantial suggestions.
[3] Fessenden (NN/g). *3 Design Processes for High Usability: Iterative, Parallel, Competitive.* 2024. https://www.nngroup.com/articles/parallel-and-iterative-design/ — opened; 3–5 alternatives, rough wireframes, merge-not-pick, 1996 figures.
[4] Chen, Petridis, Deng, Bari, Du, Li. *Rethinking the UI of GenUI: A Tale of Two Designs.* arXiv 2606.13843 (preprint), 2026. https://arxiv.org/html/2606.13843 — opened; N=24; breadth-first vs depth-first, fidelity, fixation.
[5] Walker, Takayama, Landay. *High-Fidelity or Low-Fidelity, Paper or Computer?* HFES 2002. https://www.leilatakayama.org/downloads/Takayama.Prototypes_HFES2002_prepress.pdf — opened; fidelity/medium did not change issues found.
[6] Pernice (NN/g). *UX Prototypes: Low Fidelity vs. High Fidelity.* 2016. https://www.nngroup.com/articles/ux-prototype-hi-lo-fidelity/ — opened; fidelity axes and pros/cons.
[7] Buxton, *Sketching User Experiences* (2007), sketch attributes, as summarised by Miksovsky. https://jan.miksovsky.com/posts/2007/09-05-bill-buxtons-sketching-user-experiences — opened; secondary quotation of pp. 111–2.
[8] Hong, Li, Lin, Landay. *End-user perceptions of formal and informal representations of web sites.* CHI 2001 EA. http://dl.acm.org/citation.cfm?id=634294 — abstract via search result only.
[9] Sefelin, Tscheligi, Giller. *Paper prototyping – what is it good for?* CHI 2003 EA. https://www.semanticscholar.org/paper/Paper-prototyping-what-is-it-good-for:-a-comparison-Sefelin-Tscheligi/ab91f6fb77f2de3b793bb934aa5a05aa5d5a3f92 — abstract opened; finding quoted from a citing paper (https://www.researchgate.net/publication/228830451_Teaching_user_interface_prototyping) via search result.
[10] Rudd, Stern, Isensee. *Low vs. high-fidelity prototyping debate.* Interactions 3(1), 1996. https://dl.acm.org/doi/10.1145/223500.223514 — search-result summary only.
[11] McCurdy et al. *Breaking the fidelity barrier.* CHI 2006. https://www.semanticscholar.org/paper/Breaking-the-fidelity-barrier:-an-examination-of-of-McCurdy-Connors/87f66f475244cd413c09fd255941ee6a6b49d985 — abstract-level via search result; five fidelity dimensions incl. data model.
[12] Chernev, Böckenholt, Goodman. *Choice overload: A conceptual review and meta-analysis.* J. Consumer Psychology 25(2), 2015. https://chernev.com/wp-content/uploads/2017/02/ChoiceOverload_JCP_2015.pdf — opened; 99 observations, four moderators.
[13] Scheibehenne, Greifeneder, Todd. *Can There Ever Be Too Many Options?* J. Consumer Research 37(3), 2010. https://academic.oup.com/jcr/article-abstract/37/3/409/1827647 — page blocked (403); content via search-result summaries only.
[14] Wadinambiarachchi et al. *The Effects of Generative AI on Design Fixation and Divergent Thinking.* CHI 2024. https://dl.acm.org/doi/10.1145/3613904.3642919 — abstract via search result; N=60.
[15] Suh, Chen, Min, Li, Xia. *Luminate: Structured Generation and Exploration of Design Space with LLMs.* CHI 2024. https://dl.acm.org/doi/10.1145/3613904.3642400 — abstract via search result.
[16] Imteyaz et al. *Design Theater.* arXiv 2607.22928, 2026. https://arxiv.org/abs/2607.22928 — opened; stated design rationale vs implementation gap.
[17] Huang et al. *Learning to Draw ASCII Improves Spatial Reasoning in Language Models.* arXiv 2604.14641, 2026. https://arxiv.org/abs/2604.14641 — opened; read-write asymmetry.
[18] Jia et al. *ASCIIEval.* arXiv 2410.01733. https://arxiv.org/abs/2410.01733 — search-result content only.
[19] NN/g. *The Aesthetic-Usability Effect.* https://www.nngroup.com/articles/aesthetic-usability-effect/ — search-result content.
[20] NN/g. *Wireflows.* https://www.nngroup.com/articles/wireflows/ — search-result snippets.
[21] Almaer. *Stitch Design Variants.* 2025. https://blog.almaer.com/stitch-design-variants-a-picture-really-is-worth-a-thousand-words/ — opened; practitioner (Google) view of cheap visual comparison.
[22] Tutorials Dojo. *What Google Stitch Actually Does.* 2026. https://tutorialsdojo.com/what-google-stitch-actually-does-and-where-it-falls-short/ — search-result content; default 3 variants, creative range, aspects to vary.
[23] Techgenyz. *Google AI Studio Design Variations.* 2026. https://techgenyz.com/google-ai-studio-design-variations-layout-generator/ — opened; secondary news source.
[24] Anthropic. *Introducing Claude Design.* 2026-04-17. https://www.anthropic.com/news/claude-design-anthropic-labs — opened; explorations, interactive prototypes, handoff.
[25] Figma. *Variation Generator for Design Exploration.* https://www.figma.com/solutions/variation-generator/ — search-result content.
[26] Lovable docs. *Plan mode.* https://docs.lovable.dev/features/plan-mode — search-result content.
[27] LogRocket. *Vercel v0 and the future of AI-powered UI generation.* 2024. https://blog.logrocket.com/vercel-v0-ai-powered-ui-generation/ — search-result content; secondary.
[28] Andy Budd, *My First Impressions of Balsamiq*, 2009. https://andybudd.com/archives/2009/04/my_first_impressions_of_balsamiq ; Balsamiq author page https://balsamiq.com/author/peldi-guilizzoni/ — search-result content; practitioner opinion on sketchy style.
[29] *Rethinking Prototype Fidelity in the Age of Generative AI.* Interactions, Jul–Aug 2026. https://interactions.acm.org/archive/view/july-august-2026/rethinking-prototype-fidelity-in-the-age-of-generative-ai-when-high-fidelity-becomes-cheap-its-time-to-revisit-our-foundational-design-wisdom — page blocked (403); snippet only [UNVERIFIED].
[30] Greenberg, Buxton. *Usability Evaluation Considered Harmful (Some of the Time).* CHI 2008. https://www.billbuxton.com/usabilityHarmful.pdf — not opened; abstract via search: early-stage evaluation "can mute creative ideas". Supports R8's caution against premature polish; cited only there.
[31] Marvel blog, *Why Testing with Real Content Is Better Than Lorem Ipsum* (https://marvelapp.com/blog/testing-real-content-better-lorem-ipsum/); UXmatters 2012 (https://www.uxmatters.com/mt/archives/2012/10/tips-on-prototyping-for-usability-testing.php) — search-result content; practitioner opinion, no controlled study found.
[32] *I got tired of Claude's misaligned ASCII diagrams.* 2026. https://blog.notpritam.in/i-got-tired-of-claude-s-misaligned-ascii-diagrams-so-i-built-claude-canvas — search-result content; practitioner report.
[33] Nielsen, Faber (NN/g). *Parallel Design and Testing.* https://www.nngroup.com/articles/parallel-design/ — search-result content: "not recommended for all projects".
