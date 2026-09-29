# Interviewing an Office Worker to Find the Smallest Useful Personal Tool

Scope: how an AI agent should interview an office worker who cannot name what they want, so it can pick a first version worth building. Sources were opened unless marked [snippet] (only search-result text seen) or [UNVERIFIED]. "[INFERENCE]" marks my own synthesis, not a sourced claim.

## Recommendations

**A. Process shape**

1. **Run a fixed, short, staged interview instead of free-form chat.** Use the six stages in "Interview stages and exit criteria" below. In one simulated benchmark, LLMs chatting free-form elicited under half of hidden requirements, and their useful questions came late [7]. Adding an explicit requirements-concern structure to the same base model raised elicited-requirement coverage from 0.13 to 0.41 [8]. Step-by-step guidelines also reduced interviewer errors (e.g. final summaries) [6]. Caveat: both are website-scenario simulations (see Open questions).
2. **Track a silent slot checklist and never read it out.** Slots: trigger, inputs, steps, output, who receives it, frequency, time cost, where data lives, sensitivity. Skip a slot when the user says it doesn't apply, and stop probing that branch [8]. [INFERENCE: the slot names are mine, adapted from the aspect/dimension/slot idea in [8].]
3. **Time-box the interview.** Target 15–25 minutes, about 10–15 exchanges, before the first build. Sources: Torres advises recruiting with a 20-minute ask [26]; text-based AI interviews in a large study ran about 30 minutes [19][snippet]; LLMREI sessions ran about 30 minutes including reading and questionnaire time [6]. LLMREI's bots also ended early when users showed low interest [6]. Fatigue effects are documented only for hours-long surveys [36][snippet], so there is no direct evidence for the exact number. Offer the user a "pause and build what we have" exit at any time.
4. **Vary methods; don't rely on one habit.** Less experienced analysts pick the one technique they know or repeat what worked last time [1]. Mix story-telling (Stage 1), artifact walk-through (Stage 2) and reaction to a concrete first version (after Stage 5).

**B. Getting situations, not features**

5. **Open with one specific-past-episode question, never "what do you want?"** Use "Tell me about the last time you …" [25][26]. General or habitual questions produce aspirational answers, so Torres builds every interview around a specific story of past behavior [26]. Fitzpatrick's rules give the same instruction: talk about their life, not your idea, and ask about specifics in the past, not generics or future opinions [27][28].
6. **Excavate the story chronologically.** Torres ("excavate the story"): a first answer like "last night after dinner" is not yet a story, so the interviewer prompts for context, trigger, and sequence [26]. Ask: what set it off, then what, where were you, what else was open [25][26]. Silence and echoing the user's emotional words help memory [search result on Torres's course page, snippet].
7. **Ask *when*, not *what*, when the user names a feature.** Basecamp's calendar case: "we asked her *when* she wanted a calendar", which surfaced "see free spaces" and turned a six-week project into a small one [32]. Treat "I need a dashboard/app/database" as a symptom; ask for the last moment the user wished they had it.
8. **Mine the workaround.** Ask for the spreadsheet, email thread, template or copy-paste routine they use now. Contextual inquiry exists because summaries omit habitual steps; in NN/g's example, users hid steps (cross-referencing, saving after every entry) until observed [22]. The AI cannot watch the user's screen, so ask them to share a redacted or fake-data copy and "walk me through it as if I'm new". [INFERENCE: this substitutes an artifact for observation.] Use the master/apprentice stance: the user is the expert, and the AI states its interpretations for them to correct [22].
9. **Reflect back in the user's words after each chunk and invite correction.** Contextual inquiry's interpretation principle: share your understanding so the participant corrects it [22]. Ferrari et al. found that an analyst explicitly surfacing an ambiguity is often "a conversational picklock" for tacit knowledge (34 simulated interviews; a vision paper, not a controlled trial) [4]. Ask "What did I get wrong?", not "Is that right?" [INFERENCE from [22], [14]].
10. **Cap "why" laddering at two or three rungs.** Laddering moves from what the user does to consequences to what matters, by repeatedly asking why it matters [34][snippet]. Card shows "5 whys" chains are linear and non-reproducible, with little evidence of effectiveness, so don't chase one chain to the bottom [35][snippet]. One LLM laddering framework reports good chain convergence, but only in simulated interviews [11].
11. **Use a critical-incident probe for edge cases only.** "A time when this went badly" finds rare, important cases but over-represents extreme events [23]. Default to "the last time" [23][26].

**C. When the user can't name anything**

12. **Start from friction, time and people, not needs.** Use the scripts in "Question scripts" below. Ulwick and Christensen both argue customers describe solutions poorly and need to be asked about the job and its circumstances [30][31] (Ulwick's abstract is available; article body paywalled). Moesta: nobody does anything randomly; find the struggling moment and context [29].
13. **Offer concrete options only after the user has told their own story, and always include "neither".** LLMREI participants asked the bot for guidance, and its "context-enhancing" suggestions were appreciated [6], while NN/g warns against suggesting answers or naming things for the user [24]. Reconcile by offering at most two or three examples shaped like the user's episode, then asking them to react. [INFERENCE]
14. **If the user can't recall, do it live.** Say "open the file/mailbox and let's do one now" (contextual-inquiry fallback [22]). If still empty, propose building the tiniest possible slice and learning from use. Experts recommend iterating when confidence in understanding is low [1]. Torres: disappointing interviews happen and shouldn't be forced [25].

**D. Steering toward a small first build**

15. **Ask for one moment.** "What's the one moment in the last week you'd most like to have skipped or sped up?" This is the walking-skeleton idea applied to requirements: a tiny end-to-end implementation of one small function, kept, not thrown away [33][snippet].
16. **Set a fixed appetite; let scope flex.** Ask "if this had to be useful by tomorrow morning, what would it *only* do?" Shape Up: "fixed time, variable scope"; appetites start with a number and end with a design [32].
17. **Keep a visible Later list and answer new ideas with "interesting, maybe later".** Hickey and Davis note experts keep an issues list on the side so tangents aren't lost or followed [1]. Shape Up's default response to a raw idea is a soft "maybe some day", not a backlog commitment [32]. [INFERENCE: for the user, keep one short visible "Later" list so ideas feel captured but are not promised.]
18. **Turn the user's real episode into the acceptance test.** "We'll know it works if last Tuesday's case comes out right." Anchors success to observed behavior, not to a feature list [25][26].

**E. Conversation mechanics for an LLM interviewer**

19. **One question per turn (two only if tightly related).** LLMREI's bots overwhelmed users by asking several questions at once. The authors' own error taxonomy (Bano et al.) did not cover this, so they added "one at a time, or two closely related" to the prompt [6]. Ferrari et al. record an analyst unable to interpret a customer's chaotic multi-part utterance [4]. [Evidence for exactly one is thin; see Open questions.]
20. **Begin each turn with a neutral echo, not praise.** "So the totals get retyped from the email into the sheet." Avoid "Great idea!" See sycophancy below [14][15].
21. **Don't start building until the Stage 5 exit criteria are met.** Laban et al.: LLMs make assumptions early, propose solutions prematurely and then "get lost and do not recover" (39% average drop in multi-turn vs single-turn) [13]. Recapping all information in one turn helped only partially [13]. Keep a running, corrected summary and restate it before coding. [INFERENCE: the running summary is mine, motivated by [13].]
22. **Use the user's words; introduce every new term only once, with an example.** Non-programmers reported being unable to articulate intent and lacking vocabulary; 42% named wording as a problem [20]. Anything unfamiliar, like "database", "sync" or "API", is banned in questions; substitute "list", "the same info in two places", and so on. [INFERENCE for the ban; [20] supports the vocabulary problem.] Ferrari et al. show jargon and vague terms cause unclarity [4].
23. **Never collect personal data, quote prices/timelines, or promise features you can't back.** LLMREI's bot once asked for an email address and once invented a project price [6]. Also see Conflicts (privacy).

## Interview stages and exit criteria

[INFERENCE: this staging is my synthesis of sources [4][6][8][22][25][26][29][32]; the exact numbers are not empirically derived.]

| Stage | Purpose | Exit criteria |
|---|---|---|
| 0. Frame (1 exchange) | Set expectations: ~20 min, one question at a time, "I'll ask about things that happened, not what you want", "say skip any time", say once that what they show the AI goes to OpenAI under their ChatGPT account (see [08](08-security-compliance.md)) [22 primer][26] | They agree. |
| 1. Find the episode (2–3) | Pick one recent annoying, repetitive or error-prone thing | One concrete recent episode with date-ish anchor, trigger, and outcome. |
| 2. Walk the workaround (3–5) | See real inputs, steps, tools and hand-offs; harvest vocabulary | AI can restate 4–8 steps and they say what's wrong; a glossary of 5–10 of the user's nouns with their definitions; they have shown or described the real file or email. |
| 3. Stakes (2–3) | Frequency, time, consequence, 2–3 "why does that matter" rungs | Stated in the user's words: how often, roughly how long, what goes wrong or gets delayed, and what "better" looks like. |
| 4. Slice (2–3) | Choose the one moment; fix appetite; write the Later list | One-sentence first version: "does X for moment Y", plus explicit "will not do A, B, C (yet)". They edit it. |
| 5. Confirm and close (1–2) | Test understanding, catch what was missed | Summary in the user's words; they name at least one correction or explicitly say nothing is wrong after being asked "what did I get wrong?"; acceptance test = their episode; asked "anything I should have asked?" [28]. Then build. |

Escape rules: no episode by exchange 5 → do Stage 2 live; user disengages → jump to Stage 4 with what exists [6 showed bots adapting to low interest].

## Question scripts

Use these as seeds, not lists; ask one at a time and adapt to the user's words.

**Stage 1: find the episode (the user can't name a need)**

- "Think back over this past week at work. Was there a moment you thought, 'ugh, there has to be a better way'? What was happening?"
- If none: "What did you do first thing Monday? … and then? Was any of it something you do again and again?"
- "Which task do you most often put off, or do twice because something went wrong the first time?"
- "Tell me about the last time you had to do that." [26]

**Stage 2: walk the workaround**

- "What did you open to get that done — a file, an email, a website? Could you share a copy with the private bits swapped for fake ones?"
- "Walk me through it like I'm new here. What do you click, copy or type first?"
- "Where does the information come from? Where does it end up? Who gets it next?"
- "Is there a tab, note or spreadsheet you keep just to track this?"
- "You said 'the tracker' — is that the same as the sheet you showed me, or something else?" (paraphrase-back to surface ambiguity [4])

**Stage 3: stakes and ladder (max 2–3 rungs)**

- "About how often does that happen? About how long did last time take?"
- "What was annoying about it?" then "What would that have let you do instead?" [34][snippet]
- "Why haven't you been able to fix this already?" (from Mom Test notes [28], secondary source)
- "Tell me about a time it went wrong." (critical incident, edge cases only [23])

**Turning a feature request into a situation**

- The user says: "I want a dashboard." → "When would you have looked at it? Tell me about the last time you needed that answer." [32]
- The user says: "It should have reminders." → "Tell me about the last time something slipped. What happened?"
- The user says: "It should do everything." → "If it only did one thing by tomorrow, which moment from last week would you pick?" [32]

**Stage 4: slice**

- "So the annoying part is [the user's words]. Would it be okay if the first version only handled that, and nothing else?"
- "Here's my Later list so far: [their ideas]. Anything I'm missing, or anything you'd move up?"
- "How will we know it worked — could we run last Tuesday's case through it?"

**Stage 5: close**

- "Here's what I understood, in your words. What did I get wrong or leave out?"
- "Is there anything I should have asked but didn't?" [28]

**Phrases to avoid**: "Would you use…", "Wouldn't it be great if…", "Should it have a database/login?", "What features do you want?", "Which of these designs do you prefer?"

## Key evidence

**Elicitation research.** Hickey and Davis interviewed nine experienced analysts (Booch, Constantine, DeMarco, Gause, Lister, Lockwood, Robertson, Wiegers, Yourdon). They found less experienced analysts rely on the one technique they know or on what worked last time, that experts adapt techniques to the situation, and that they describe defaults but shift under anomalous conditions [1]. Experts also value observation of users when feasible, issues lists, and models to surface gaps [1]. Several experts cautioned that the stated "system" may not be the real problem [1].

Dieste and Juristo's systematic review reports interviews (mostly structured) among the most effective techniques, better than card sorting, ranking and thinking aloud [2][snippet]. The same summary says analyst experience did not appear to matter and prototyping showed no positive effect during elicitation [2][snippet] (see Open questions).

Bano et al. observed 110 then 138 students conducting interviews: 34 unique mistakes in seven themes, with question formulation, question omission and interview order the pain points that did not improve over three interviews [3]. The paper full text was not available to me, so I cannot quote individual mistake names.

Mohedas et al.: recommended interviewing practices correlated with how much interview information reached requirements; "encouraging deep thinking" and "being flexible and opportunistic" distinguished stronger novices [5].

**Ambiguity and tacit knowledge.** Ferrari et al. (34 simulated interviews, analyst first author; explicitly a vision paper): four ambiguity types (unclarity, multiple understanding, incorrect disambiguation, correct disambiguation). Their examples show the analyst silently picking a wrong interpretation ("tap control" meant tapping *with the voice*) until a later contradiction revealed it [4]. Surfacing ambiguity aloud often unlocked tacit knowledge, hence paraphrase-back and asking for examples.

**LLM interviewers.**
- LLMREI (Korn et al., RE'25): GPT-4o bot, 33 interviews with students role-playing two scenarios. Long structured prompt (five-step guidance) made fewer errors than short (64.2% vs 59.1% of ratings scored "mistake not present"); similar mistake counts to trained student interviewers; elicited up to 73.7% of scenario requirements (60.9% fully). About half of questions were context-dependent. Failure modes seen: multiple questions at once, invented price, asked for user's email, no non-verbal cues. Fine-tuning on transcripts of student interviews made bots worse [6].
- Free-form LLM chat vs structured: ReqElicitGym (101 website scenarios, simulated oracle user) found LLMs elicit less than half of implicit requirements and struggle with style requirements [7]. OntoAgent adds an aspect-dimension-slot ontology plus pruning; implicit-requirement elicitation ratio rose to 0.69, versus 0.39 for LLMREI-short and 0.13 for the base model [8]. Baselines hardly explored "style" (near zero), a category a personal-tool interview would also miss without an explicit checklist [8].
- Shen et al. found GPT-4o follow-up questions no worse than human-authored, and better when guided by known interviewer-mistake types [9].
- Singhal et al. (2026): AI-assisted interviews covered fewer topics (9.6 vs 14.5) but asked more follow-ups per topic (3.43 vs 1.15) [10]. Depth over breadth is what a one-episode interview wants.
- Elicitron simulates *users* with LLM agents [12]. This skill has a real user, so it is not applicable; do not role-play their needs.

**Contextual inquiry (Beyer and Holtzblatt).** As summarized by NN/g: master/apprentice; four principles (context, partnership, interpretation, focus); four-part session (primer, transition, contextual interview, wrap-up); risks include participants slipping back into interview mode, sessions becoming grievance lists, and the interviewer biasing the participant [22]. I did not read the original book; treat "show me the last time" as the practitioner paraphrase.

**Critical incident technique.** Flanagan 1954 via NN/g: ask for a specific incident with positive or negative impact, then scripted clarifications; strengths include rare events, weakness is recall bias toward extremes [23].

**Story-based interviewing.** Torres: research questions ≠ interview questions; people answer direct questions with fast, unreliable answers; collect stories about specific past behavior [25][26]. She also states the golden rule: let the participant talk about what they care about most [25].

**Mom Test.** Fitzpatrick's official page only shows marketing text [27]. The rules and "bad data = compliments, fluff/hypotheticals, ideas/wishlists" come from Kadlac's book notes (secondary) [28]. Also: "you aren't allowed to tell them what their problem is, and they aren't allowed to tell you what to build" [28].

**Jobs to be Done.** Christensen et al.: people "hire" products for jobs; circumstances matter more than buyer traits [30]. Moesta: interviews reconstruct a timeline (first thought, passive looking, active looking, deciding); the struggling moment creates demand; anomalies and "irrational" behavior mean context is missing; interview people who already switched [29]. For the user, the analogue is what they do *today*, which is the thing the tool will replace.

**Scope control.** Walking skeleton [33][snippet]; Shape Up appetite and "narrow the problem" [32].

**LLM-specific risks.** Sycophancy is general behavior of five assistants, plausibly driven by human preference for agreeable answers [14]. A Science study summarized by Scientific American: models affirmed users about 49% more than humans, and users preferred the sycophantic model [15]. Two weeks of user interaction context increased agreement sycophancy in tested models [16]. Non-programmers succeeded on 1.4 of 4 simple natural-language-to-code tasks, with prompt reliability 0.088, and reported feeling stuck, not knowing how to describe intent, and lacking terminology [20]. LLM agents given a clarification-seeking scaffold closed most of the gap to fully specified tasks on SWE-bench (69.4% resolve rate) [21].

## Open questions and disagreements

- **Direct evidence on LLM interviewers with real non-technical users interviewing about their own personal tools is essentially absent.** LLMREI used students role-playing (33 interviews) [6]; ReqElicitGym and OntoAgent use simulated oracle users on website scenarios [7][8]. All the numbers above should be treated as directional.
- **Questions per turn:** the only direct evidence is LLMREI's authors' observation that multi-question turns overwhelmed users [6], plus Ferrari's example of an uninterpretable multi-part utterance [4]. "Exactly one" is a design decision, not a measured optimum. LLMREI still allowed "two closely related" [6].
- **Interview length:** no study I found measures the optimal length of an LLM requirements interview. The numbers (15–25 min) are extrapolated from [6][19][26] and general fatigue findings [36]. Fatigue effects come from hours-long surveys.
- **Prototypes as elicitation:** Dieste and Juristo's summary says prototyping showed no positive effect on elicitation and experience appeared irrelevant [2][snippet]; Hickey and Davis found only two of nine experts mentioned prototyping, with caveats (rapid only if truly rapid; needs trust) [1]. Our principle (build a tiny slice, learn from use) conflicts with neither, but the evidence base is old and about analysts, not AI-built one-off apps. I only saw the review's summary, not its data.
- **Structured vs open interviewing:** Dieste and Juristo favor structured interviews [2][snippet]; Torres and Moesta favor letting the participant steer [25][29]. My staging is semi-structured: fixed goals per stage, free wording and order within stages.
- **Laddering / 5 whys:** popular but weakly evidenced [35][snippet]; kept short here.
- **Mom Test rules are for founders validating ideas with third parties.** Here the user is both the customer and the person being interviewed about their own life; the analogous social pressure is deference to the AI, not politeness to a founder. That transfer is an inference.
- **JTBD prescribes interviewing people who already switched** [29]. Nobody has switched yet; the closest analogue is current workaround behavior.
- **Contextual inquiry** is well documented by practitioners [22] but I could not open Beyer and Holtzblatt's original; the AI cannot literally observe the user.

## Conflicts with the guiding principles

- **Data leaves the user's machine during the interview.** Stage 2 asks for real artifacts (spreadsheets, emails), and every reply goes to the model provider, which cuts against "user data never leaves their machine without their knowing." LLMREI's authors also flag provider data handling as a limitation [6]. Mitigation: ask for redacted or fake-data copies, tell the user exactly what is being shared, and never ask for personal identifiers [6]. This should be surfaced to Main as a real tension, not solved by wording.
- **Ontology first vs discovery.** The AI cannot pre-agree a vocabulary before hearing the user's stories; the useful glossary comes from their own nouns (Stage 2 exit). Ferrari's finding that ambiguity is a discovery tool [4] suggests not front-loading definitions. Compatible if "ontology first" means "before building", not "before interviewing".
- **Sycophancy vs "user is ground truth".** The AI must gently challenge scope, and Shape Up-style "maybe later" [32] is a soft no. Fine, but an over-agreeable model [14][15] will undermine the deferral list unless the skill forbids it explicitly.
- **No other conflicts with the technology-choice, desktop/local-first or no-admin-rights principles.** Environment questions (Windows/Mac, where files live) must be asked in the user's terms and are outside this slice.

## Sources

1. Hickey, A. M. & Davis, A. M., "Elicitation Technique Selection: How Do Experts Do It?", RE 2003. http://csis.pace.edu/~marchese/CS775/Papers/hickey_davis_elicitation.pdf — nine expert analysts; novices repeat one technique; issues lists; observation.
2. Dieste, O. & Juristo, N., "Systematic Review and Aggregation of Empirical Studies on Elicitation Techniques", IEEE TSE 37(2), 2011. https://dl.acm.org/doi/10.1109/TSE.2010.33 [snippet; findings seen only through a search summary and the IET/Pacheco text, not the paper].
3. Bano, Zowghi, Ferrari, Spoletini, Donati, "Teaching requirements elicitation interviews: an empirical study of learning from mistakes", Requirements Engineering 24, 2019. https://digitalcommons.kennesaw.edu/facpubs/4556/ — 34 novice mistakes in 7 themes (abstract only).
4. Ferrari, Spoletini, Gnesi, "Ambiguity and tacit knowledge in requirements elicitation interviews", Requirements Engineering 21, 2016. https://openportal.isti.cnr.it/data/2016/353983/2016_353983.postprint.pdf — ambiguity as a tool to reveal tacit knowledge.
5. Mohedas et al., "The use of recommended interviewing practices by novice engineering designers…", Design Science 8, 2022. https://www.cambridge.org/core/journals/design-science/article/use-of-recommended-interviewing-practices-by-novice-engineering-designers-to-elicit-information-during-requirements-development/F381F9A0E2ED7E4349B338A1990A12B0 — recommended practices correlate with usable information (abstract).
6. Korn, Gorsch, Vogelsang, "LLMREI: Automating Requirements Elicitation Interviews with LLMs", RE 2025 / arXiv 2507.02564. https://arxiv.org/html/2507.02564v1 — closest direct evidence on LLM interviewers.
7. Jin et al., "ReqElicitGym…", arXiv 2602.18306, 2026. https://arxiv.org/abs/2602.18306 — LLMs elicit under half of implicit requirements; good questions come late.
8. Jin et al., "From Chat to Interview: Agentic Requirements Elicitation with an Experience Ontology", arXiv 2605.05828, 2026. https://arxiv.org/pdf/2605.05828 — structured slot ontology beats free-form chat.
9. Shen, Singhal, Breaux, "Requirements Elicitation Follow-Up Question Generation", arXiv 2507.02858, 2025. https://arxiv.org/abs/2507.02858 — LLM follow-ups guided by mistake types.
10. Singhal, Carvalho, Breaux, "AI-assisted Script Management for Requirements Elicitation Interviews", arXiv 2608.01640, 2026. https://arxiv.org/abs/2608.01640 — depth vs breadth in AI-assisted interviews.
11. Aithal, Kotz, Mitchell, "LadderTeam", arXiv 2608.17029, 2026. https://arxiv.org/abs/2608.17029 — LLM laddering in simulation only.
12. Ataei et al., "Elicitron", arXiv 2404.16045, 2024. https://arxiv.org/abs/2404.16045 — LLM-simulated users (not applicable here).
13. Laban, Hayashi, Zhou, Neville, "LLMs Get Lost In Multi-Turn Conversation", arXiv 2505.06120, 2025. https://arxiv.org/abs/2505.06120 — premature solutions and unreliability; recap only partly helps.
14. Sharma et al., "Towards Understanding Sycophancy in Language Models", ICLR 2024 / arXiv 2310.13548. https://arxiv.org/abs/2310.13548 — sycophancy is general in RLHF assistants.
15. Parshall, "AI chatbots are suck-ups…", Scientific American, 26 Mar 2026 (reporting Cheng et al., Science). https://www.scientificamerican.com/article/ai-chatbots-are-sucking-up-to-you-with-consequences-for-your-relationships/ — secondary report; 49% more affirming than humans.
16. Jain et al., "Interaction Context Often Increases Sycophancy in LLMs", arXiv 2509.12517, 2025. https://arxiv.org/abs/2509.12517 — sycophancy rises with interaction context.
17. Xiao et al., "Tell Me About Yourself…", ACM TOCHI 2020 / arXiv 1905.10700. https://arxiv.org/abs/1905.10700 — probing chatbot elicits better open-ended answers.
18. Jacobsen et al., "Chatbots for Data Collection in Surveys: A Comparison of Four Theory-Based Interview Probes", CHI 2025 / arXiv 2503.08582. https://arxiv.org/abs/2503.08582 — probe types by research stage.
19. Chopra & Haaland, "Conducting Qualitative Interviews with AI", 2023. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4572954 [snippet; page not fetchable] — 381 text-based ~30-min AI interviews; dynamic probing drives value.
20. Feldman & Anderson, "Non-Expert Programmers in the Generative AI Future", CHIWORK 2024. https://www.feldmanmolly.com/chiwork2024-author-version.pdf — 67 non-programmers; vocabulary and articulation barriers.
21. Edwards & Schuster, "Ask or Assume? Uncertainty-Aware Clarification-Seeking in Coding Agents", arXiv 2603.26233, 2026. https://arxiv.org/abs/2603.26233 — asking beats assuming for underspecified tasks.
22. Flaherty, "Contextual Inquiry…", NN/g, 2020. https://www.nngroup.com/articles/contextual-inquiry/ — summary of Beyer and Holtzblatt method, structure, and risks.
23. Rosala, "The Critical Incident Technique in UX", NN/g, 2020. https://www.nngroup.com/articles/critical-incident-technique/ — CIT question forms; recall bias (cites Flanagan 1954).
24. Schade, "Avoid Leading Questions…", NN/g, 2017. https://www.nngroup.com/articles/leading-questions/ — what makes a question leading.
25. Torres, "Ask Teresa: What Are the Best Customer Interview Questions?", Product Talk (updated 2026). https://www.producttalk.org/best-customer-interview-questions/ — research questions vs interview questions; golden rule.
26. Torres, "Customer Interviews: How to Recruit, What to Ask, and How to Synthesize…", Product Talk. https://www.producttalk.org/customer-interviews/ — "Tell me about the last time…"; excavating stories; 20-minute ask.
27. Fitzpatrick, *The Mom Test* (official site). https://www.momtestbook.com/ — book page only; no rules text.
28. Kadlac, "The Mom Test — Book Notes". https://www.kadlac.com/notes/the-mom-test-rob-fitzpatrick/ — secondary notes on the rules, bad data types, question examples.
29. Moesta, "Live JTBD Case Studies…" (BoS Europe 2024 transcript). https://businessofsoftware.org/talks/live-jobs-to-be-done-case-studies/ — struggling moment, timeline, forces, anomalies.
30. Christensen, Hall, Dillon, Duncan, "Know Your Customers' 'Jobs to Be Done'", HBR 2016. https://hbr.org/2016/09/know-your-customers-jobs-to-be-done — job and circumstance framing (abstract accessible; body paywalled).
31. Ulwick, "Turn Customer Input into Innovation", HBR 2002. https://hbr.org/2002/01/turn-customer-input-into-innovation — customers describe solutions poorly; focus on outcomes (intro and search summary).
32. Basecamp, *Shape Up*, ch. 3 "Set Boundaries". https://basecamp.com/shapeup/1.2-chapter-03 — appetite, fixed time/variable scope, "when did you want a calendar", soft "maybe some day".
33. Cockburn's walking skeleton definition (from *Crystal Clear*), as quoted in Adzic, "Forget the walking skeleton – put it on crutches". https://gojko.net/2014/06/09/forget-the-walking-skeleton-put-it-on-crutches/ [snippet; not opened].
34. Reynolds & Gutman, "Laddering Theory, Method, Analysis, and Interpretation", J. Advertising Research, 1988. https://www.tandfonline.com/doi/abs/10.1080/00218499.1988.12467766 [snippet; original not opened] — laddering definition.
35. Card, "The problem with '5 whys'", BMJ Quality & Safety, 2017. https://pubmed.ncbi.nlm.nih.gov/27590189/ [snippet] — 5 whys lacks evidence for complex problems.
36. "Exhaustive or exhausting? Evidence on respondent fatigue in long surveys", J. Development Economics, 2022. https://www.sciencedirect.com/science/article/abs/pii/S0304387822001341 [snippet; page blocked] — effects measured over survey hours.
