# Shared Vocabulary ("Ontology") with a Non-Technical User Who Doesn't Write Code

Scope: how the AI builds a small shared vocabulary with a non-technical user at project start, and how it manages technical terms afterwards. Research done 2026-09-29. Marks: **[snippet]** = I only saw the source through search-result text, not the full page; **[INFERENCE]** = my synthesis, not a finding in a source.

## Recommendations

### A. Build the starter vocabulary from the user's stories

1. **Elicit words by having the user narrate one real, recent case, not by asking for definitions.** Ask "Walk me through the last time an invoice arrived: what happened, who did what?" Record every noun (things they handle) and every verb (things they do) verbatim. This is the core move of Domain Storytelling (actors, activities = verbs "from the domain language", work objects, numbered sequence) [11] and of Big Picture EventStorming, where experts write what happens in their own phrasing and past-tense form is not forced at first [9][10]. Prefer their own phrasing; their first-draft wording is data, not noise.
2. **The user's words are canonical; the AI adapts to them, never the reverse.** People rarely pick the same word for the same thing (in Furnas et al.'s five domains, two people chose the same term with probability <0.20) [29], so the AI's "natural" label will usually be wrong for the user. Match "the users' language" rather than system terms [32]. Pick their most-used word as the primary name and note their other words as aliases (see rec 12).
3. **Sort what you hear into three buckets only: Things, Actions, Rules.** Rules are the user's "when X, then Y" sentences; in Pane et al.'s study non-programmers wrote 54% of statements as event/production rules starting with *when/if/after* [31], so this is the shape they will produce naturally. Do not add categories (entity, status, workflow, schema...) to the conversation.
4. **Keep the software mapping out of the user's sight.** Maintain the mapping (invoice → stored record; "chase up" → scheduled reminder; supplier → contact list) in a separate builder-facing section or file, and name screens, buttons, files and code identifiers with the user's words. Precedent: Evans says a language change is a model change and code should be renamed to match [2]; EventStorming practitioners deliberately say "Action" not "command" and "Constraint" not "aggregate" with business people, and warn jargon creates an insider/outsider split [9]. [INFERENCE: for a non-English speaker, keep UI text in the user's words and use plain English identifiers, with the mapping table bridging.]
5. **Close the loop with a read-back before building.** Replay the user's situation as a short story using only their words and ask "What did I get wrong or leave out?" Evans: "Describe scenarios *out loud* using the elements... Domain experts should object to terms or structures that are awkward or inadequate" [2]; using the language with the expert is how it gets tested [1]. Liu et al. found that translating what the system will do back into a predictable natural-language utterance improved end-user programmers' understanding of scope and the language needed (n=24) [34].
6. **Don't run a workshop or produce a big glossary up front.** Elicit around the first thin slice only (smallest useful thing first). Evans wants language to evolve with understanding [1][2]; EventStorming says allow "good enough" language early and refine when needed [10]. Novices want to do a real task, not learn everything first (Carroll's "paradox of the active user") [24].

### B. Introduce technical terms only when needed

7. **Default to no term; describe the thing in the user's words.** Plain-language guidance: technical terms are fine "where you need to", but explain them on first use [15]; keep definitions few ("use them rarely") [13]; substitute everyday language where possible [14]. GOV.UK: metaphors slow comprehension, say what you mean [15].
8. **Gate every new term with three questions.** (a) Do I need it to ask the user a decision or to tell them something they must act on? (b) Will it recur in the next few sessions? (c) Is there no plain description of about eight words? Introduce only on yes/yes/yes. Rationale for (b): incidental vocabulary learning grows with each encounter (Webb: sizable gains at ~10 encounters; meta-analysis r = .34 for repetition) [25][26]; a term the user will meet once is not worth teaching. [INFERENCE: those studies are second-language vocabulary, not jargon.]
9. **Use the term-introduction pattern** (full template below): the user's word → new name + one-line meaning in their domain → why we need it now → example from their data → teach-back → log it. Tie the explanation to something on their screen or in their files. Pail's "Useful Abstractions" panel did the same kind of grounding, a name plus a one-sentence description, so user and AI can "validate that they are referring to the same concepts" [33].
10. **Introduce at most one new term per message and three per session.** Working memory holds about four chunks (Cowan) [19]; Miller's "seven" was a rhetorical device and his real point was recoding into chunks [20][21]. A novice's load depends on prior knowledge, and a schema the user already owns counts as one element [22], so their own domain words are cheap but new software words are expensive. Progressive disclosure is the parallel UI rule: show the few things needed now, defer the rest, and more than 2 levels loses users [23].
11. **Verify with teach-back, never "Does that make sense?"** AHRQ: ask the user to say it back in their own words or show you; "Do you understand?" and "Does that make sense?" are not teach-back questions because people say yes regardless; parroting suggests non-understanding; chunk the information and check after each chunk; frame it as checking your explanation, not testing them [27]. People systematically overrate their understanding of how things work until asked to explain (illusion of explanatory depth) [28]. Ask "If I said 'set a reminder on the Acme invoice', what would you expect to happen?"
12. **Use analogies sparingly, from the user's own job or projects, and say where they break.** Analogies help but incomplete mappings can leave the analogy as the user's only mental model; Teaching-With-Analogies says to state limitations explicitly [39]. Ko et al. built a "factory" metaphor for designers and list where it breaks (speed, remote reference) [30]. Prefer "like your supplier list" (or "like your club's member list") over "like a database is like a filing cabinet".

### C. Size, growth, retirement, visibility

13. **Target sizes** ([INFERENCE] from [19][22][25][26][23]; no study measures project glossaries for non-programmers): 
    - **The user's domain words:** 8–15 at the start, of which no more than ~4 are the pivotal nouns the first build revolves around. They already know them; the limit is read-back review burden (about one screen).
    - **Borrowed software words:** 0 at the start. At most ~5 active at any time in the first month. Beyond 5, the user is probably being taught software instead of being helped; replace with plain descriptions.
    - **Whole visible glossary:** about 15–25 lines. Above ~25, prune (rec 15).
14. **Add a term when it passes rec 8, or when the user uses a new word for a thing.** Add their new words the moment they appear, with today's date and the sentence they said it in.
15. **Retire rather than accumulate.** Retire a borrowed term when the feature is deleted, when it has not been used for ~3 sessions, or when the user has never said it back (then switch to a plain description instead of re-teaching). Keep a "Retired" section (word → replaced by → why → date) so a dead word is not silently resurrected. [INFERENCE: the retirement thresholds are mine.] Volere treats the glossary as living: "used and extended throughout the project" [5].
16. **Keep it visible in the project.** A plain-language glossary file the AI maintains and the user can open and edit (template below); the AI announces each change in one line ("I added 'reminder' to our word list"); and the agent's project instructions point at it so every session starts by reading it. Reasons: in Pail's formative study design decisions "rapidly disappeared into chat history" and models considered earlier decisions less as they receded [33]; LLMs' multi-turn reliability falls sharply (avg 39% drop; unreliability +112%) [37]. [INFERENCE: a re-read glossary should reduce drift; no source tests this directly.]

### D. Failure modes

17. **Maintain a "careful words" list of false friends and never use them in their software sense with the user.** Seed it with file, save, account, field, report, form, table, folder, export, backup, template, update, run, sync, record, key, sheet. Before building around such a word, ask for a concrete example ("show me a 'report' you make today"). Evidence that the same word means different things: VB's "form" means a window, which drove wrong assumptions [30]; non-programmers use "and" for "next" 29% of the time, "or" for restating 24%, "then" for "afterwards" 66% [31]; Fowler's electricity "meter" meant three things at once [3]; Volere's glossary example is "Truck" defined narrowly [6]; IREB defines homonyms as "a term looking identical to another term but having a different meaning" [7].
18. **Do not redefine a common word.** Plain-language guidance: "Never define a word to mean something other than its commonly accepted meaning"; readers forget the special meaning and revert to the ordinary one [13]. If the user's "report" means "the weekly email to my boss" (or "the monthly list I send the club"), call it that (their word, their meaning) and use a different word for the software's output.
19. **One concept, one word.** "You will confuse your audience if you use different terms for the same concept"; the reader wonders whether it is the same thing; you don't need synonyms for interest [12]. Record aliases in the glossary but always say the primary. If the user switches word (bill → invoice), ask which they want, then rename everywhere in one sweep (screens, files, docs, code).
20. **Stop the AI silently switching terms.** Give the AI a pre-send check: every noun/verb in a user-facing message must be a glossary word, a plain word, or a term being introduced now. Re-read the glossary at session start and before summarising work. Also translate tool output: error messages and status text are a known barrier for learners ("understanding barriers", 34 of 38 insurmountable in Ko et al.) [30]; restate them in the user's words.
21. **Pitch at the user's level, which is lower than your default.** In 25,000 Bing Copilot conversations the agent answered at proficient or expert level 77% of the time, and misalignment (agent below the user's level) hurt experience [36]; in a study of 120 beginners, replies sometimes assumed technical knowledge the students lacked and beginners' prompts were vague [35] [snippet]. Do not rely on the AI "noticing" the user is confused; use teach-back (rec 11).
22. **Don't trust "being aware" of the curse of knowledge.** Awareness and incentives do not remove it [18]; Pinker's remedy is to show drafts to a representative reader [17]. Here the reader is the user: the read-back, teach-back and visible glossary are the structural check.
23. **Flag unresolved ambiguity instead of forcing agreement.** When the user uses one word for two things ("done" = sent vs paid), mark it as an open question in the glossary and ask when it matters; EventStorming "hotspots" keep conflicting meanings visible rather than resolving them prematurely [9][10]. Duplicate stickies may be "the same language for different concepts" [9].

## Templates

### Glossary file (superseded by `CONTEXT.md` in [09](09-context-file.md); kept for the reasoning behind each section)

```markdown
# Our words
The words we use for <the user's project>. Your words come first. If any is wrong or missing, tell me and I will change it.
Last changed: <date>

## Things (nouns)
| Word | What it means here | Example from your work | Also said as | Since |
|---|---|---|---|---|
| invoice | A bill a supplier sends us that we have to pay | "the Acme one from 3 March" | bill | day 1 |

## Actions (verbs)
| Word | What it means here | Example | Also said as | Since |
|---|---|---|---|---|
| chase up | Contact a supplier again because a payment or reply is late | Emailing Acme a week after the due date | nudge | day 1 |

## Rules ("when ... then ...")
- When an invoice is 7 days past due, chase up the supplier. (your words, <date>)

## Words I borrowed from software (max ~5 at a time)
| Word | Meaning in one line, in your work | Why we needed it | Said back by you? | Since |
|---|---|---|---|---|
| reminder | A note the app shows you on a chosen day about one invoice | to schedule "chase up" | yes, <date> | <date> |

## Careful words (mean something different on a computer)
| Everyday word | What you mean | Software meaning (I won't use it with you) | What I will say instead |
|---|---|---|---|
| report | The weekly email I send my boss | Any generated summary | "weekly email" / "summary sheet" |

## Open questions (one word, two meanings?)
- "done" for an invoice: sent, or paid? Ask when we build the status list.

## Retired
| Word | Replaced by | Why | Date |
|---|---|---|---|
```
Builder-only notes (separate section/file the user never has to read): `their word -> label on screen -> how stored -> notes`. Code identifiers, screen labels and file names are derived from the user's words.

### Term-introduction pattern (one term per message)

1. **Gate**: does the user need it now (decision/action), will it recur, is a plain description too long? Otherwise skip.
2. **Bridge from the user's word**: "You said you *chase up* suppliers."
3. **Name + one-line meaning in the user's domain**: "The app can do that for you with a *reminder*: a note that appears on the day you choose, on one invoice."
4. **Why now**: "I'm asking because I need to know how many days after the due date it should appear."
5. **Example from the user's data**: "For the Acme invoice due 3 March, the reminder would show on 10 March."
6. **Teach-back / show-me** (not yes/no): "In your own words, what would you see on 10 March, and what would you do?" If the user parrots, re-explain differently and ask again.
7. **Log and announce**: add to "Words I borrowed" and say so in one line.
8. **Then use it exactly**: never swap for "alert", "notification" or "task". If the user uses another word, mirror it back once, ask which they prefer, update aliases.

## Key evidence

- **DDD ubiquitous language.** Fowler: a common, rigorous language between developers and users, based on the model; using it with domain experts is part of testing it; it should evolve as understanding grows [1]. Evans (2015): language structured around the model, used by everyone "within a bounded context"; "a change in the language is a change to the model"; translation between developer and expert dialects "blunts communication"; use the same language "in diagrams, writing, and especially speech" [2]. Fowler on bounded context: polysemes like "meter", "Customer", "Product" cause confusion "smoothed over in conversation but not in the precise world of computers"; different human cultures need different models [3]. Vernon: DDD is "primarily about modeling a Ubiquitous Language in an explicitly Bounded Context" [4] [snippet].
- **Requirements-engineering glossaries.** Volere: names "invoke meanings that, if carefully defined, can save hours of explanations"; attention to names "helps to highlight misunderstandings"; the glossary "is used and extended throughout the project" [5]; template text (via search) says write a succinct definition that stakeholders agree, reflect terminology in current use in the work area, avoid abbreviations, and gives the "Truck" example [6] [snippet]. IREB glossary defines homonyms and synonyms [7] [snippet]. Leite's LEL defines each term ("symbol") by *notion* and *behavioral responses*, with a *circularity* principle (maximize use of other LEL symbols) and a *minimal vocabulary* principle (use basic natural-language vocabulary), and the idea "understand the language of the problem, without worrying about the problem" [8] [snippet]. This is the closest formal precedent for a client-language-first lexicon.
- **Event storming / storytelling.** Domain events in past tense; don't force form early; conflicts and language inconsistencies get a hotspot instead of premature resolution; business-friendly renames (Action, Constraint) [9][10]. Domain Storytelling captures actors, verbs and work objects as the expert speaks and calls out that these verbs form the ubiquitous language [11]. Both are practitioner methods; the sources are workshop guides, not controlled studies.
- **Plain language.** Same term for same concept, no elegant variation [12]. Definitions "use them rarely"; never define a common word differently; define at point of use [13]. Jargon vs necessary technical terms distinction [14]. GOV.UK: explain technical terms first time; avoid metaphors; words-to-avoid list [15]. ISO 24495-1:2023 states the goal that readers can find what they need, understand it, and use it; applies to technical writing [16][snippet for the three-part definition].
- **Curse of knowledge.** Newton's 1990 tapping study: tappers overestimated recognition (predicted ~50%, actual 2.5% of 120 songs in secondary accounts) [18]; the bias is not reduced by being told about it or by incentives [18] (Wikipedia summary of Camerer, Loewenstein & Weber and follow-ups: secondary). Pinker: the chief cause of opaque writing; test drafts on a representative reader [17].
- **Working memory and learning.** Cowan: capacity limit of about four chunks (3–5) [19]; Miller's seven was a rhetorical device and recoding into chunks was the point [20][21]. CLT: novices benefit from explicit guidance, split attention and redundancy raise load, prior knowledge lowers intrinsic load [22]; caveat: measurement and generalizability of CLT are contested [22]. Progressive disclosure: show the few important options first; >2 levels lowers usability [23]. Carroll: people want to do real tasks and skip manuals [24].
- **Repetition and vocabulary.** Second-language incidental learning gains keep rising with encounters, about 10 for sizable gains (Webb 2007), pooled r = .34 (Uchihara et al. 2019) [25][26].
- **Teach-back and overestimated understanding.** AHRQ toolkit (2024): specifics in rec 11 [27]. Rozenblit & Keil: illusion of explanatory depth [28] [snippet].
- **Novices, end-user programmers and LLMs.** Ko et al. (40 non-programmers learning VB.NET; 130 barriers): learners' invalid assumptions cascade; "form" means window; understanding barriers were mostly insurmountable (34/38) [30]. Pane et al.: keyword meanings of and/or/then, 45% of statements from the end-user's perspective [31]. Pail (CHI 2025, 11 participants, mostly experienced programmers): explicit jargon grounding with a one-sentence description; design decisions get lost in chat; participants suffered information overload [33]. Liu et al.: grounded abstraction matching [34]. Nguyen et al.: 120 beginners, 57% eventual success, 24% per attempt; vague prompts; replies assumed knowledge (via abstract/snippet) [35]. Palta et al. [36]. Laban et al.: 39% average drop multi-turn, LLMs "get lost" after wrong assumptions [37]. Tie et al. 2024 (26 participants): failure types include cognitive overload and context loss [38]. O'Brien et al.: users hold misplaced expectations about assistant capabilities such as web access and code execution [40].

## Open questions and disagreements

- **No source measures the right number.** Sizes in rec 13 are derived from lab working-memory and L2 vocabulary studies; no study tests the size of a project glossary for non-programmers. Cowan's four chunks concern short-term recall, not how many vocabulary items one can adopt over weeks. Treat the numbers as starting heuristics to tune.
- **Alias vs single term.** Furnas advocates unlimited aliasing so systems find what users mean [29]; plain-language guidance says never vary the term [12]. Resolution used here (aliases recorded, one primary spoken) is my synthesis.
- **Analogies.** Useful for novices but double-edged; no study on analogies for software concepts with non-technical users [39].
- **AI as teach-back judge.** AHRQ warns people parrot [27]; whether an LLM reliably detects parroting or is lenient is untested in my sources. [INFERENCE: prefer show-me tasks tied to the user's data over paraphrase alone.]
- **Glossary-in-context effectiveness.** Laban shows multi-turn unreliability [37]; nothing I found tests whether a re-read glossary prevents terminology drift in coding agents.
- **Evidence quality.** EventStorming, Domain Storytelling and Volere are practitioner methods. The curse-of-knowledge non-correction claim is via Wikipedia [18]. File/folder confusion is anecdotal [41]. Several sources were read only as search snippets (marked). Pane's samples are children and students; Pail's participants were mostly programmers, so neither is a clean match for a non-technical user.
- **Code names in the user's language.** DDD wants the same words in code [2][4]; for a non-English speaker the trade-off is unresolved.
- **Explicit teaching vs discovery.** CLT favours explicit guidance for novices [22]; minimalist instruction favours task-first learning [24]. Just-in-time explicit definitions attached to real tasks satisfy both, but I found no direct test.

## Conflicts with the guiding principles

- **"Ontology first" vs evolving language.** Evans, EventStorming and Carroll all say the language should grow from real use and the user wants to start doing [1][2][10][24]. The principle holds only if "first" means a tiny story-based starter set (rec 6, 13), not an up-front glossary workshop.
- **"Never expose technology" vs safety vocabulary.** The local-first, no-cloud, user-data-stays-home principles require the user to understand a few concepts (this stays on this computer, a backup, sending something online). These cannot be fully hidden; they are safety-critical and should be the first borrowed words, taught in plain language with teach-back. The evidence does not say this is wrong; it is a tension to plan for.
- **Minor:** plain-language guidance says minimize definitions [13]; a maintained glossary is compatible only if its main audience is the AI (consistency) and the user sees definitions rarely.
- No source contradicts the rest of the principles (small first, AI picks technology, desktop bias, no admin rights).

## Sources

[1] Martin Fowler, "Ubiquitous Language" (bliki), 2006. https://martinfowler.com/bliki/UbiquitousLanguage.html. Opened. Definition, Evans quotes, language tested with experts.
[2] Eric Evans, *Domain-Driven Design Reference*, 2015 (CC BY 4.0). https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf. Opened. Primary text of the Ubiquitous Language pattern.
[3] Martin Fowler, "Bounded Context" (bliki), 2014. https://martinfowler.com/bliki/BoundedContext.html. Opened. Polysemes ("meter", "Customer").
[4] Vaughn Vernon, *Domain-Driven Design Distilled*, ch. 2, 2016. https://www.oreilly.com/library/view/domain-driven-design-distilled/9780134434964/ch02.html. Search snippet only. UL in a bounded context.
[5] Volere (Robertson & Robertson), Requirements Specification Template, Edition 20 extract, section 4 "Naming Conventions and Terminology". https://www.volere.org/templates/volere-requirements-specification-template/. Opened. Glossary purpose.
[6] Volere Template Edition 16 (2012) PDF. https://www.cs.uic.edu/~i440/VolereMaterials/templateArchive16/c%20Volere%20template16.pdf. Search snippet only. Glossary guidance, "Truck" example.
[7] IREB, CPRE Glossary 2.1. https://isqi.org/media/12/26/2f/1710758439/ireb_cpre_glossary_EN_2.1.pdf. Search snippet only. Homonym/synonym definitions.
[8] Leite & Franco's Language Extended Lexicon, as summarised in "Deriving requirements specifications from the application..." (WER 2012). https://werpapers.dimap.ufrn.br/papers/WER2012/paper_2.pdf. Search snippet only. LEL notion/behavioral response, circularity, minimal vocabulary.
[9] DDD Crew, EventStorming Glossary & Cheat Sheet (from Brandolini's work). https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet. Opened. Action/Constraint renames, jargon warning, hotspots, duplicates as different concepts.
[10] SoftwareMill, "Big Picture Event Storming - mastering chaos", 2024. https://softwaremill.com/big-picture-event-storming-mastering-chaos/. Search snippet only. Past tense not forced early; "we don't have to agree on the language".
[11] Hofer & Schwentner, Domain Storytelling quick-start guide. https://domainstorytelling.org/quick-start-guide. Search snippet only. Actors, verbs, work objects.
[12] plainlanguage.gov, "Use the same terms consistently". https://raw.githubusercontent.com/GSA/plainlanguage.gov/main/_pages/guidelines/words/use-the-same-terms-consistently.md. Opened. Same term for same concept.
[13] plainlanguage.gov, "Minimize definitions". https://raw.githubusercontent.com/GSA/plainlanguage.gov/main/_pages/guidelines/words/minimize-definitions.md. Opened. Don't redefine common words, define at point of use.
[14] plainlanguage.gov, "Avoid jargon". https://raw.githubusercontent.com/GSA/plainlanguage.gov/main/_pages/guidelines/words/avoid-jargon.md. Opened. Necessary technical terms vs jargon.
[15] GOV.UK, A to Z style guide (technical terms, words to avoid, metaphors). https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/. Opened.
[16] ISO 24495-1:2023 Plain language, Part 1. https://www.iso.org/standard/78907.html. Opened (abstract/scope); three-part goal via search snippet of ANSI preview.
[17] APS Observer, "The Curse of Knowledge: Pinker Describes a Key Cause of Bad Writing", 2015. https://www.psychologicalscience.org/observer/the-curse-of-knowledge-pinker-describes-a-key-cause-of-bad-writing. Opened. Pinker's remedy.
[18] Wikipedia, "Curse of knowledge" (Newton 1990 tapping study; bias not reduced by awareness/incentives). https://en.wikipedia.org/wiki/Curse_of_knowledge. Opened. Secondary; the 2.5%/50% figures come from search-returned secondary accounts (e.g. University of Arizona UCATT), not the primary.
[19] Nelson Cowan, "The magical number 4 in short-term memory", Behavioral and Brain Sciences 24, 2001. https://philpapers.org/rec/COWTMN. Search snippet only (page blocked); "about four chunks" also stated in [22].
[20] George Miller, "The Magical Number Seven, Plus or Minus Two", 1956. https://labs.la.utexas.edu/gilden/files/2016/04/MagicNumberSeven-Miller1956.pdf. Search snippet only. Recoding/chunks.
[21] Centigrade, "The Number Seven Is Not Magical..." 2020. https://www.centigrade.de/en/blog/the-number-seven-is-not-magical-part-1/. Search snippet only. Miller (1989) called seven a rhetorical device.
[22] NSW CESE, "Cognitive load theory: Research that teachers really need to understand", 2017. https://education.nsw.gov.au/content/dam/main-education/about-us/educational-data/cese/2017-cognitive-load-theory.pdf. Opened. Review of CLT with critiques.
[23] Jakob Nielsen, "Progressive Disclosure", NN/g, 2006. https://www.nngroup.com/articles/progressive-disclosure/. Opened.
[24] Carroll & Rosson, "Paradox of the active user" (1987). https://research.cs.vt.edu/ns/cs5724papers/4.mental.mental.carroll.paradox.pdf; see also https://www.nngroup.com/articles/paradox-of-the-active-user/. Search snippet only.
[25] Webb, "The effects of repetition on vocabulary knowledge", Applied Linguistics 28(1), 2007. https://www.researchgate.net/publication/31064743_The_Effects_of_Repetition_on_Vocabulary_Knowledge. Search snippet only.
[26] Uchihara, Webb & Yanagisawa, Language Learning 69(3), 2019 (meta-analysis). https://onlinelibrary.wiley.com/doi/abs/10.1111/lang.12343. Search snippet only (26 studies, 1,918 participants, r = .34).
[27] AHRQ, "Use the Teach-Back Method: Tool 5", Health Literacy Universal Precautions Toolkit 3rd ed., 2024. https://www.ahrq.gov/health-literacy/improve/precautions/tool5.html. Opened. Primary source for teach-back practice.
[28] Rozenblit & Keil, "The misunderstood limits of folk science: an illusion of explanatory depth", Cognitive Science 26, 2002. https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog2605_1. Search snippet only.
[29] Furnas, Landauer, Gomez & Dumais, "The vocabulary problem in human-system communication", CACM 1987. https://dl.acm.org/doi/10.1145/32206.32212. Search snippet only (Scholar/Semantic Scholar abstract text).
[30] Ko, Myers & Aung, "Six Learning Barriers in End-User Programming Systems", VL/HCC 2004. https://faculty.washington.edu/ajko/papers/Ko2004LearningBarriers.pdf. Opened.
[31] Pane, Ratanamahatana & Myers, "Studying the language and structure in non-programmers' solutions to programming problems", IJHCS 54(2), 2001. https://john.pane.net/pdf/PaneRatanamahatanaMyers2001.pdf. Opened (first half).
[32] NN/g, "Match Between the System and the Real World (Heuristic #2)". https://www.nngroup.com/articles/match-system-real-world/. Search snippet only.
[33] Zamfirescu-Pereira et al., "Beyond Code Generation: LLM-supported Exploration of the Program Design Space", CHI 2025. https://arxiv.org/abs/2503.06911. Opened. Jargon grounding, lost decisions, overload.
[34] Liu et al., "'What It Wants Me To Say': Bridging the Abstraction Gap Between End-User Programmers and Code-Generating LLMs", 2023. https://arxiv.org/abs/2304.06597. Opened (abstract).
[35] Nguyen et al., "How Beginning Programmers and Code LLMs (Mis)read Each Other", CHI 2024. https://arxiv.org/abs/2401.15232. Search snippet only; participants were CS students, not non-technical users.
[36] Palta et al., "Speaking the Right Language: The Impact of Expertise Alignment in User-AI Interactions", 2025. https://arxiv.org/abs/2502.18685. Opened (abstract).
[37] Laban et al., "LLMs Get Lost In Multi-Turn Conversation", 2025. https://arxiv.org/abs/2505.06120. Opened (abstract). Unreliability under underspecified multi-turn chat.
[38] Tie et al., "'Should I Give Up Now?' Investigating LLM Pitfalls in Software Engineering", 2024. https://arxiv.org/abs/2411.09916. Opened (abstract). Context loss and overload as failure types.
[39] Effects of analogical processes on learning and misrepresentation, Educational Psychology Review. https://link.springer.com/article/10.1007/BF01323662; Teaching with Analogies overview http://www.csun.edu/science/books/sourcebook/chapters/10-analogies/teaching-analogies.html. Search snippets only.
[40] O'Brien et al., "User Misconceptions of LLM-Based Conversational Programming Assistants", 2025. https://arxiv.org/abs/2510.25662. Opened (abstract).
[41] PC Gamer, "Students don't know what files and folders are, professors say", 2021. https://www.pcgamer.com/students-dont-know-what-files-and-folders-are-professors-say/. Search snippet only; anecdotal press report, not a study.
