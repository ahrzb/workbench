# Software 1.0 vs "2.0" (hosted-LLM extraction): terms, cost, accuracy, privacy, decision rules

Research date: 2026-09-29. All prices below were read from the vendors' own pages on that date. Model names and prices in this space move fast (see R12), so the skill must treat every number here as a starting point to re-check, never as a constant.

## Recommendations

**Terminology**

1. **Keep the skill's labels internal and rename them for anything user-facing.** Karpathy's "Software 2.0" is neural-net weights found by optimisation from a dataset, code "no human is involved in writing" [1]. His "Software 3.0" is LLMs programmed in English prompts [2][3][4]. So "call a hosted LLM to parse messy invoices" is *Karpathy's 3.0*, not 2.0. The skill's "3.0 = agentic/MCP" is a further narrowing that he treats as one topic (partial autonomy, autonomy sliders) inside 3.0 [4]. Use plain names with the user ("rules", "ask an AI model", "AI that takes actions") and do not cite Karpathy to justify the numbering.

**Deterministic first**

2. **Try code before a model, in this order:** (a) a structured e-invoice inside the file (ZUGFeRD/Factur-X PDFs embed XML; XRechnung is pure XML) [38]; (b) the PDF's own text layer via `pdfplumber`, which "works best on machine-generated, rather than scanned, PDFs" [39]; (c) regex/keyword rules for a small number of stable layouts; (d) only then a model call. Germany, for example, requires businesses to be able to receive EN 16931 e-invoices from 2025 and to issue them from 2027/2028 [38], so an EU user's invoice pile is getting more structured, not less.
3. **Decide per document, not per app.** A hybrid router: if the XML/text-layer parser returns all required fields and passes validation (R9), never call a model; otherwise fall back to the model. This shrinks both cost and data exposure.

**Choosing and calling a model**

4. **Default to the cheapest current multimodal model from a provider whose paid tier does not train on data**, send the page as an image/PDF (not pre-OCR'd text), and request a JSON schema. Native image input beat parse-to-text (Docling) pipelines in the only open multi-model invoice benchmark found: about 11 points on clean invoices, ~29 on scanned invoices (92.7% vs 64.0%) and ~40 on scanned receipts [14]. Do not build an OCR-then-LLM pipeline unless privacy demands it (see Conflicts).
5. **Use provider structured-output modes**: OpenAI Structured Outputs [19], Anthropic `output_config.format` / strict tool use [20], Gemini `response_format` with a JSON schema [21], Ollama `format` [25]. They guarantee parseable JSON that matches the schema, **not correct values**: OpenAI says outputs "can still contain mistakes" [19]; Gemini says to "always validate values" and handle "schema-compliant but semantically incorrect outputs" [21]. Refusals and `max_tokens` truncation can also break the schema [20].
6. **Name schema fields in the user's agreed vocabulary** (ontology slice), e.g. `supplier`, `amount_due`, not `vendor_tax_total_gross`. Make every field nullable with an explicit "not found" so the model is never forced to invent a value [19].
7. **Never hard-code a model name or price.** Put `model`, `provider`, and a per-document cost estimate in a single config file. OpenAI gives only ≥6 months' notice for GA models and has already scheduled `gpt-5-mini`/`gpt-5-nano` snapshots for shutdown on 2026-12-11 (replacement `gpt-5.6-terra` costs $2.00/$12.00, 8x/6x more than `gpt-5-mini`) [9][6]; Gemini 3.x Flash prices double on 2027-01-01 [5]. Add a startup check that the model still exists and that the user hears about a price change before spending.
8. **Set the model up for extraction, not chat:** temperature 0 (Ollama tip [25]) and minimal/capped "thinking", because Gemini output pricing includes thinking tokens [5]. Expect run-to-run variation even at temperature 0 on hosted endpoints [42]; cache results per file hash so a re-open never re-asks and never changes yesterday's answer.

**Validation ("LLM extracts, code validates")**

9. **Ship a validator with every extractor.** Minimum set: required fields present; types/currency parse; dates plausible; `sum(line amounts) = net`, `net + tax = total` within a rounding tolerance; IBAN checksum and VAT-ID format where used; duplicate detection on (supplier, invoice number). Why: the failures documented are exactly these kinds: IBAN digit/letter confusion (0 vs O/U; IBAN was the worst field on clean invoices) [14], comma read as decimal point [15], skipped or merged line items on unusual layouts [15]. Exact-match scoring in [14] means every such slip costs a whole field.
10. **Route by confidence, not by hope.** Show the user only the flagged documents/fields side-by-side with the source image; auto-accept the rest only after the validator passes. Real confidence signals exist: Mistral OCR 4 returns per-word confidence and bounding boxes [18]; for black-box LLMs, research estimators like CONSTRUCT rank fields by likely error without logprobs [22]. Simple fallback: run the extraction twice (or with two models) and flag fields that disagree [INFERENCE].
11. **Human-in-the-loop with an audit trail:** store source file hash, model+version, prompt version, raw JSON, validator result, and who approved which edit. Karpathy's own warning applies: LLMs are "jagged", "keep a human in the loop" [4]; and "demo is works.any(), product is works.all()" [4].
12. **Calibrate on the user's own documents before trusting anything.** Have the user hand-check 20-30 real documents (or synthetic look-alikes, R16) and report field-level accuracy; vendors themselves say benchmarks are "directional" and to "evaluate on your own documents" [18].

**Privacy, keys, cost control (opt-in and visible)**

13. **Make model calls a visible, per-feature opt-in.** First-run screen in plain words: "To read messy invoices this app sends the invoice image to *Provider Y* (USA). Nothing is sent otherwise. [Send this one] [Always for this app] [Never — use rules only]". Show a persistent "AI: on/off" indicator and a log of what was sent, when, to whom, and cost. Provide a truly working offline/rules-only mode. (Design recommendation; justified by DPA duties in R15.)
14. **Handle the API key like a password, not a config file.** Store in the OS credential store via Python `keyring` (macOS Keychain, Windows Credential Locker) [36]; never write it to the project folder, never commit it, never paste it into the AI chat. Fallback if no keyring: `.env` outside the repo with user-only permissions [INFERENCE]. Tell the user where the key comes from and that *she* is being billed (R17).
15. **Ask the policy questions before any real data moves:** Does her employer allow sending this data to an AI provider? Is there a company-approved account/key? Is personal data (names, addresses, IBANs, customers) in these files? The employer is normally the controller and the provider a processor under Art. 28 GDPR [44]; OpenAI's and Anthropic's DPAs apply to business accounts and put on the customer the duty to have "all necessary notices, rights, consents" to send data [31][34]. An office worker signing up with a personal account cannot sign that DPA for her employer [INFERENCE from 31; a secondary source says personal accounts cannot execute OpenAI's DPA]. If the answer is "unknown", default to rules-only or local, and say why in one sentence. Evidence that this is the real risk: 66% of surveyed office professionals used AI tools they believed were not permitted, and 34% pasted customer data into public AI tools [37].
16. **Build and demo with synthetic or public sample invoices, never her real ones.** The coding agent that builds the app is itself a cloud data flow; consumer and commercial plans differ in retention and training terms [32][33]. Tell the user which files the agent may open.
17. **Minimise what leaves the machine:** send page 1 (or a crop), strip PDF metadata, never send whole folders, send inline rather than through file-upload APIs (Anthropic Files API and OpenAI `/v1/files` retain until deleted [32][30]), set `store: false` on OpenAI Responses calls (default application-state retention is 30 days) [30]; avoid batch endpoints for sensitive data (Anthropic Batch is not ZDR-eligible, 29-day retention [32]); never put customer names or amounts in schema `enum`/property names (Anthropic caches schemas up to 24 h [32]).
18. **Pick the tier by policy, not price.** Gemini free tier: content is used to improve Google products and human reviewers may read it; the terms say not to submit sensitive, confidential or personal data [29]; paid tier does not train on prompts but logs them for limited abuse-detection time [29]. In the EEA/CH/UK the paid-tier data terms apply even to free usage, but the terms also require Paid Services when making a client available to users there [29]. OpenAI API: not used for training by default, up to 30-day abuse-monitoring retention, ZDR only by approval [30]. Anthropic API: inputs/outputs deleted within 30 days, not used for training without permission, ZDR by contract [33][32]. Mistral: EU-hosted; free-plan training terms not confirmed from a primary source [UNVERIFIED].
19. **Redaction is a last resort, not a default.** Presidio (`pip`, offline) detects names, card numbers, IBANs etc. but "there is no guarantee that Presidio will find all sensitive information" [35]. On invoices the personal data *is* the payload, and redacting pushes you towards the text-parse pipeline that scored 11-40 points lower [14]. Prefer local model or rules-only for personal-data-heavy documents.
20. **Cap the spend inside the app.** Cost is trivial (below), so the risk is bugs, not price: count calls, refuse above a user-set monthly limit, and show "this month: $0.03" [INFERENCE].
21. **Treat document content as hostile input.** Text hidden in a PDF can carry instructions to the model [41]. Keep the extraction call tool-less and output-schema-only so the worst case is a wrong field, which the validator/human step must catch; never let an extraction call trigger emails, file writes, or payments.

**Local models (privacy option)**

22. **Offer a local path only as an explicit "private mode" with honest quality warnings.** Ollama for Windows installs per-user, "does not require Administrator", into `%LOCALAPPDATA%` [23]; a per-user `ollama-windows-amd64.zip` CLI also exists [23]. On macOS the app can be placed outside `/Applications` and the CLI symlink in `/usr/local/bin` is a permission prompt that can be skipped [24]. `llama.cpp` ships plain zips (Windows) and tar.gz (macOS arm64/x64), no installer [26]. Do **not** default to LM Studio on macOS: a user report says it insists on `/Applications` (admin) [27] (single anecdote, [UNVERIFIED]).
23. **Size the local model to the laptop, and test extraction before promising anything.** Gemma 4 weights need about 4.5 GB (E4B) to 6.7 GB (12B) at 4-bit, plus context memory [28]; Ollama on Intel Macs is CPU-only [24]. Local models must be fed page *images*, so add `pypdfium2` (prebuilt wheels bundling PDFium) for PDF→image rendering [40]. In [14], `gemma-3-12b` reached 82.1% on scanned invoices vs 91.6% for `gemini-2.5-flash-lite`, and `gemma-3-4b` collapsed to 45.7% on clean invoices, "a capability threshold below which smaller models are less effective" [14]. Gemma 4 and other current local models were not benchmarked there [UNVERIFIED].

## Key evidence

### Terms (R1)
- Karpathy 2017: 1.0 = code written by programmers; 2.0 = "weights of a neural network", specified through a dataset and architecture, "no human is involved in writing this code"; trade-off "90% accurate model we understand, or 99% accurate model we don't"; can "silently fail" [1]. Note: Medium page metadata shows a 2021 date but the visible post date is Nov 11, 2017 [1].
- June 2025 YC AI Startup School talk "Software Is Changing (Again)": "Software 3.0, where natural language becomes the new programming interface" [2]; Karpathy: "LLMs are a new kind of computer, and you program them in English. Hence... a major version upgrade... Software 3.0" [3]. swyx's annotated notes: 3.0 "is eating 1.0/2.0"; autonomy sliders and generation-verification loops are parts of the talk, not a fourth number [4].
- Consequence: the user-facing skill's "2.0 = single LLM call" and "3.0 = agents" are the skill's own scheme. A genuine Karpathy-2.0 option (fine-tuned layout models such as LayoutLM) exists but needs fine-tuning and labeled data [14]; it is out of scope for this user.

### Pricing (dated 2026-09-29, USD per 1M tokens, standard tier)

| Model | Input | Output | Batch in / out | Source & notes |
|---|---|---|---|---|
| Gemini 3.5 Flash-Lite | 0.30 | 2.50 | 0.15 / 1.25 | [5]; output includes thinking tokens |
| Gemini 3.1 Flash-Lite | 0.25 | 1.50 | 0.125 / 0.75 | [5] |
| Gemini 3.8 Flash | 0.75 → 1.50 | 3.75 → 7.50 | half | [5]; higher price starts 2027-01-01 |
| gpt-6-luna | 0.10 | 0.50 | 0.05 / 0.25 | [6] cheapest OpenAI listed |
| gpt-5.6-luna | 0.20 | 1.20 | 0.10 / 0.60 | [6] |
| gpt-5.4-nano | 0.20 | 1.25 | 0.10 / 0.625 | [6] |
| gpt-5.4-mini | 0.75 | 4.50 | 0.375 / 2.25 | [6] |
| gpt-5-mini | 0.25 | 2.00 | 0.125 / 1.00 | [6]; **shutdown 2026-12-11** [9] |
| gpt-4.1-mini | 0.40 | 1.60 | 0.20 / 0.80 | [6] |
| gpt-4o-mini | 0.15 | 0.60 | 0.075 / 0.30 | [6] |
| Claude Haiku 4.5 | 1.00 | 5.00 | 0.50 / 2.50 | [7] |
| Claude Sonnet 5.5 | 2.00 | 10.00 | 1.00 / 5.00 | [7] |
| Mistral Small 4 | 0.15 | 0.60 | n/a | [8] open weights, Apache 2.0 |
| Ministral 3 (8B) | 0.15 | 0.15 | n/a | [8] |
| Mistral OCR 4 | $4 per 1,000 pages ($2 batch) | | | [18][8]; Document AI (JSON via schema) $5 per 1,000 pages |
| Local (Ollama etc.) | $0 marginal | | | electricity + disk |

The cheap tier is a few tenths of a dollar per million tokens; frontier models are 20-100x that [6][7]. Gemini 3.x Flash-Lite is a viable "cheap" choice, while Gemini 3.8 Flash and Haiku 4.5 sit one step up.

### Worked cost example (1 invoice = 1 page)
Assumptions (mine): US Letter page rendered at 150 dpi (1275×1650 px), ~600 tokens for prompt + JSON schema, ~500 output tokens (header fields + 5 line items).
- **Generic 3,000 in / 500 out** (price comparison only): gpt-6-luna $0.00055; gpt-4o-mini $0.00075; Mistral Small 4 $0.00075; gpt-5.6-luna $0.0012; Gemini 3.1 Flash-Lite $0.0015; Gemini 3.5 Flash-Lite $0.0022 ($0.0011 batch); Gemini 3.8 Flash $0.0041 (→ $0.0083 from 2027); Haiku 4.5 $0.0055; Sonnet 5.5 $0.011.
- **Vendor-specific token counts:**
  - Gemini: 258 tokens per PDF page [10] (native PDF text not charged on Gemini 3 [10]) + 600 = ~860 in → **$0.0015** on 3.5 Flash-Lite; if the model spends 1,000 thinking tokens, **$0.0040**.
  - OpenAI: 2,080 32-px patches × 1.2 multiplier = 2,496 image tokens [11] + 600 = ~3,100 in → **$0.00056** (gpt-6-luna), $0.0012 (gpt-5.4-nano), $0.0046 (gpt-5.4-mini).
  - Claude Haiku 4.5: page = text (1,500-3,000 tokens) + image (capped at 1,568 visual tokens on standard tier) [13][12] → ~4,400 in → **$0.0069**.
- **Monthly, 200 invoices:** about $0.11 (gpt-6-luna) to $1.40 (Haiku 4.5). Mistral OCR 4 alone ($0.004/page) costs roughly 3-7x more than a cheap-model call and returns text, not fields, unless Document AI is used [18].
- Conclusion: at office-worker volumes cost is irrelevant; what matters is (a) needing a billing account (Gemini paid tier requires an active Cloud Billing account [29]), (b) data policy, (c) price/model churn (R7). Unit comparisons: [16] quotes $9.40 average fully-loaded manual AP cost per invoice (Ardent) but that includes approvals and exceptions, not just typing.

### Accuracy (R4, R9, R12)
- **Fraunhofer IAIS / Lamarr (arXiv preprint, Aug 2025)**: zero-shot, exact-match field accuracy, image input, three public datasets [14]:

| Model | Clean invoices (500) | Scanned invoices (350) | Scanned receipts (1000) |
|---|---|---|---|
| gemini-2.5-pro | 96.50 | 92.71 | 87.46 |
| gemini-2.5-flash-lite | 95.70 | 91.64 | 85.34 |
| gpt-5-mini | 96.31 | 86.88 | 53.92 |
| gpt-5-nano | 86.45 | 80.61 | 58.08 |
| gemma-3-12b (local-capable) | 84.66 | 82.09 | 66.91 |
| gemma-3-4b | 45.69 | 76.02 | 53.79 |

  Caveats stated by the authors: datasets are public and may be in training data; images only (no native-text PDFs tested); IBAN-type fields are worst [14]. These are 2025 models, not the ones in the pricing table, so treat them as directional [UNVERIFIED for current models]. Best model still drops 9 points from clean to scanned and 9 more to receipts, so quote per-document-type accuracy [14][16].
- **Businessware (vendor-run, March 2025, 20 invoices, 16 fields, small sample):** vision GPT-4o "occasional inaccuracies in numerical values"; DeepSeek misread a comma as a dot; unusual layouts (missing qty/amount columns, sub-items) broke every service [15]. Cost per page was ~$0.0045-$0.021 then, i.e. roughly 8-40x the per-invoice cost of the current cheap models above [15].
- **OmniDocBench (CVPR 2025):** 1,651 pages, 10 document types; pipeline tools do well on academic papers and financial reports, general VLMs on slides/handwriting [17]. Later leaderboard numbers (reproduced in [43]): Gemini-3-Pro 88.4, GPT-5.2 86.2 vs GPT-4o 75.0. It measures document parsing, not invoice field extraction, and Mistral itself says such benchmarks are "directional" with scoring artifacts [18].
- Hosted output is not deterministic even at temperature 0 because batch load changes numerics [42].

### Structured outputs (R5)
OpenAI: schema-guaranteed, refusals detectable, but "Structured Outputs can still contain mistakes" [19]. Anthropic: constrained decoding "always valid... no retries needed for schema violations" but refusal and `max_tokens` cases may not match [20]. Gemini: schema output but "always validate values in your application" [21]. Ollama: `format` accepts a JSON schema, also with vision models [25].

### Privacy and policy (R13-R21)
- OpenAI API: not used for training since March 1, 2023 unless opt-in; abuse-monitoring logs up to 30 days; ZDR/Modified Abuse Monitoring need approval; `/v1/responses` application state 30 days by default; `/v1/files` and batches persist until deleted [30]. DPA: OpenAI = processor; customer warrants "all necessary notices... rights, consents" [31].
- Anthropic API: inputs/outputs auto-deleted within 30 days; flagged content up to 2 years; retained data "never used for model training without your express permission"; ZDR by contract; Batch 29 days and Files API not ZDR; structured-output schemas cached ≤24 h [33][32]. DPA: customer = controller, Anthropic = processor [34].
- Google Gemini: free/unpaid tier content used to improve products, human reviewers may read it, "Do not submit sensitive, confidential, or personal information"; paid (billing-enabled) tier not used for training, logged for limited time for abuse; may be transiently stored in any country [29].
- Presidio: PII detection via NER/regex/checksums; explicit no-guarantee warning [35].
- keyring: uses macOS Keychain and Windows Credential Locker; installable with pip [36].
- Shadow AI: PagerDuty/Wakefield 2026 survey of 1,250 office professionals: 66% used AI tools they thought unauthorised, 88% shared work info with public AI tools, 34% customer data, 31% financial/confidential documents [37] (vendor-commissioned survey, large firms only).
- Prompt injection via documents: OWASP LLM01 lists files and documents as an indirect injection vector [41].

### Local options (R22-R23)
Ollama Windows: Windows 10 22H2+, per-user install in home dir, ≥4 GB binary footprint plus models, no Administrator [23]. Ollama macOS: Sonoma 14+, Apple Silicon (CPU+GPU) or x86 (CPU only), drag-and-drop install, CLI link is a permission prompt [24]. llama.cpp release assets include Windows x64 CPU/Vulkan zips and macOS arm64/x64 tar.gz [26]. Gemma 4 memory table [28]. Ollama's `format` parameter enforces a JSON schema locally, including with vision models [25].

### Privacy checklist (run before any real document leaves the machine)
- [ ] Employer allows this data category to go to an AI provider, or user confirmed the data is hers/non-personal (R15) [37][44].
- [ ] Provider tier chosen by data policy: paid/commercial API, not a free/unpaid tier that trains or lets humans read prompts (R18) [29][30][33].
- [ ] DPA in place if personal data of third parties is involved (OpenAI/Anthropic business terms; Gemini paid terms reference a processor DPA) [29][31][34].
- [ ] API key in OS credential store, not in project files, chat, or git (R14) [36].
- [ ] Explicit, per-feature consent screen with provider name and country; "AI: on/off" indicator; send log (R13).
- [ ] Minimum data: one page/crop, metadata stripped, inline upload, `store: false`, no batch/file endpoints, no personal data in schemas (R17) [30][32].
- [ ] Tool-less extraction call; validator + human review before anything acts on results (R9-R11, R21) [41].
- [ ] Development and demos use synthetic/public sample files; the coding agent's own data flow was disclosed (R16) [32][33].
- [ ] Spend cap and model-still-exists check configured (R7, R20) [9].
- [ ] Rules-only/local fallback verified to work with the AI switched off (R22).

### Decision heuristics: rules (1.0) vs model call ("2.0") vs hybrid
| Signal | Use rules/code | Use a model call | Hybrid (default when unsure) |
|---|---|---|---|
| Layouts | 1-3 stable layouts, same suppliers, text-layer PDFs [39] | Many/unknown layouts, scans, photos [14][16] | Rules for known suppliers, model for the rest |
| Input structure | Embedded XML / CSV / fixed fields [38] | Free text, handwriting, OCR noise [14] | Parse structure first, model for gaps |
| Cost of an error | High (payments, legal, tax): rules + human sign-off | Low or easily reviewable | Model proposes, validator + human approves [19][21] |
| Reproducibility/audit | Must give identical answer each run and be explainable [1][42] | Acceptable if cached, logged, and human-approved | Cache by file hash, log model/prompt version |
| Privacy | Personal/confidential data, employer policy unknown | Data is non-sensitive or provider is approved | Local model or redaction only if quality is measured [14][35] |
| Volume/effort | Tiny volume: manual entry may beat any automation | Cost is never the blocker (cents) | Build rules for the top 2-3 suppliers first |

Rule of thumb for the skill: start with rules on the user's three most common documents; add the model call only for the documents rules cannot parse; add validation before adding more models. Each escalation is offered as a separate, reversible, opt-in step (build-trap principle).

## Open questions and disagreements

- **No independent benchmark of current cheap models (Gemini 3.5 Flash-Lite, gpt-6-luna, gpt-5.6-luna, Haiku 4.5) on invoice fields.** The best evidence [14] is a year old and covers older models; vendors' numbers are self-reported [15][16]. The skill must measure on the user's documents (R12).
- **Text-first vs image-first.** [14] found image input far better than Docling markdown; OmniDocBench finds pipelines better for financial reports [17]. Different tasks and tools; unresolved for born-digital PDFs with a good text layer (Gemini 3 charges nothing for native text [10], which may change the calculus).
- **Vendor accuracy claims (85-95% OCR vs ~99% AI)** come from vendors selling software [16]; treat as marketing unless field type and document quality are stated.
- **Gemini 3.x token accounting for pages:** the docs still say 258 tokens per page while introducing `media_resolution` controls [10]; I could not confirm current per-page token counts for Gemini 3.5 Flash-Lite [UNVERIFIED].
- **Whether Mistral free-plan data trains models:** secondary sources say yes with opt-out; primary pages returned 404 [UNVERIFIED].
- **LM Studio macOS admin requirement:** one forum report [27], no vendor doc.
- **Legal status of an individual using an AI API on employer data** is not settled by any regulator document I found; EDPB Opinion 28/2024 and ICO material address AI models/developers generally, not this scenario (search summary, not opened in full).

## Conflicts with the guiding principles

1. **"No accounts/no cloud unless genuinely required" vs an API key.** A key is an account with a billing relationship (Gemini paid needs a Cloud Billing account [29]) and every call is a cloud data flow. Mitigation as designed: opt-in per feature, visible on/off state, per-send consent, send log, in-app spend cap, a working rules-only/local mode (R13-R14, R20, R22). "Genuinely required" should be defined as: the rules path failed on her own sample documents.
2. **Local-first vs quality.** The evidence says local models small enough for an office laptop are markedly worse for extraction (12B ≈ 82% vs 92% on scanned invoices; 4B unusable on clean invoices) [14], so "local by default" would silently ship a worse extractor. Local mode needs a measured accuracy readout.
3. **Privacy vs accuracy.** Redaction or OCR-to-text pipelines that keep raw images off the wire cost roughly 11-40 accuracy points in [14] (Docling markdown vs native image; the benchmark used scanned images, so the gap for born-digital PDFs is untested); redaction of the payload itself (names, IBANs) defeats extraction [35].
4. **"Finished app that keeps running with no maintenance" vs model churn.** Hosted models are retired with ≥6 months' notice and prices step (R7) [9][5]; a self-contained desktop app with a hard-coded model will break. The skill needs a "check model is alive" path and a note to the user that this feature has an expiry-and-review cycle, unlike rules.
5. **No-admin install:** Ollama macOS's `/usr/local/bin` prompt and the LM Studio anecdote show local runtimes are not uniformly admin-free on macOS [24][27]; `llama.cpp` zips and Ollama's standalone Windows zip are the admin-free choices [23][26].
6. **Gemini terms** restrict Gemini API/AI Studio to "professional or business purposes, not for consumer use" and require Paid Services for EEA/CH/UK clients [29]; fine for an office worker's own business use, but the skill should not assume the free tier is usable everywhere.

## Sources

[1] Andrej Karpathy, "Software 2.0", Medium, 2017-11-11. https://karpathy.medium.com/software-2-0-a64152b37c35 (opened). Origin of the term; 2.0 = neural-net weights.
[2] Y Combinator, "Andrej Karpathy: Software Is Changing (Again)", YC Startup Library, June 2025. https://www.ycombinator.com/library/MW-andrej-karpathy-software-is-changing-again (opened; description only). "Software 3.0" natural-language era.
[3] Karpathy, X post announcing the talk, June 2025. https://x.com/karpathy/status/1935518272667217925 (search result with matching quote). "Program them in English... Software 3.0".
[4] Shawn "swyx" Wang, "Andrej Karpathy on Software 3.0: Software in the Age of AI", Latent Space, 2025-06-17. https://www.latent.space/p/s3 (opened). Annotated talk: 1.0/2.0/3.0 coexistence, jagged intelligence, human-in-the-loop, "demo is works.any()".
[5] Google, "Gemini Developer API pricing", read 2026-09-29. https://ai.google.dev/gemini-api/docs/pricing (opened). Flash-Lite/Flash prices, batch, free vs paid training use, 2027 price step.
[6] OpenAI, "API Pricing", read 2026-09-29. https://developers.openai.com/api/docs/pricing (opened). luna/nano/mini/4o-mini prices.
[7] Anthropic, "Pricing", read 2026-09-29. https://platform.claude.com/docs/en/about-claude/pricing (opened). Haiku 4.5, Sonnet 5.5, batch discount.
[8] Mistral AI, "API pricing", read 2026-09-29. https://mistral.ai/pricing/api (opened; also https://mistral.ai/pricing). Small 4, Ministral 3, OCR 4 prices.
[9] OpenAI, "Deprecations". https://developers.openai.com/api/docs/deprecations (opened). gpt-5-mini/nano shutdown 2026-12-11; 6-month notice policy.
[10] Google, "Document understanding" (Gemini API). https://ai.google.dev/gemini-api/docs/document-processing (opened). 258 tokens/page; native text not charged on Gemini 3.
[11] OpenAI, "Images and vision" (cost calculation). https://developers.openai.com/api/docs/guides/images-vision (opened). 32-px patches × model multiplier.
[12] Anthropic, "Vision". https://platform.claude.com/docs/en/build-with-claude/vision (opened). 28-px patches, 1,568-token cap on standard tier.
[13] Anthropic, "PDF support". https://platform.claude.com/docs/en/build-with-claude/pdf-support (opened). 1,500-3,000 text tokens per page plus image tokens.
[14] D. Berghaus et al. (Fraunhofer IAIS, Lamarr Institute), "Multi-Modal Vision vs. Text-Based Parsing: Benchmarking LLM Strategies for Invoice Processing", arXiv:2509.04469, 2025-08-29. https://arxiv.org/abs/2509.04469 (full text opened via arxiv.org/pdf/2509.04469). Field accuracy by model and dataset; native image > parsed text; Gemma 3 local results.
[15] Businessware Technologies, "Best LLM For Invoice Processing: Pricing Per Page, Accuracy Rates", March 2025. https://www.businesswaretech.com/blog/research-ai-models-invoice-processing-benchmark (opened). Vendor benchmark, 20 invoices; error types and cost per page.
[16] Parseur, "AI Invoice Processing Benchmarks 2026", updated 2026-09-08. https://parseur.com/blog/ai-invoice-processing-benchmarks (opened). Vendor blog; summarises [14], cost per manual invoice, accuracy caveats.
[17] Ouyang et al., "OmniDocBench: Benchmarking Diverse PDF Document Parsing with Comprehensive Annotations", CVPR 2025 / arXiv:2412.07626. https://arxiv.org/abs/2412.07626 (search result with matching content). Document-parsing benchmark; pipelines vs VLMs by document type.
[18] Mistral AI, "Introducing OCR 4", 2026-06-23. https://mistral.ai/news/ocr-4/ (opened). Confidence scores, pricing, benchmark caveats, self-host is enterprise-only.
[19] OpenAI, "Structured model outputs". https://developers.openai.com/api/docs/guides/structured-outputs (opened). Schema guarantee; "can still contain mistakes".
[20] Anthropic, "Structured outputs". https://platform.claude.com/docs/en/build-with-claude/structured-outputs (opened). Constrained decoding; refusal/max_tokens exceptions.
[21] Google, "Structured outputs" (Gemini API). https://ai.google.dev/gemini-api/docs/structured-output (opened). "Always validate values".
[22] H. W. Goh, J. Mueller, "Real-Time Trustworthiness Scoring for LLM Structured Outputs and Data Extraction", arXiv:2603.18014, 2026-02-24. https://arxiv.org/abs/2603.18014 (opened). Per-field error/confidence scoring for black-box LLMs.
[23] Ollama, "Windows". https://docs.ollama.com/windows (opened). No-admin per-user install; requirements; standalone zip.
[24] Ollama, "macOS". https://docs.ollama.com/macos (opened). Drag-and-drop install; CLI link prompt; CPU-only on Intel.
[25] Ollama, "Structured Outputs". https://docs.ollama.com/capabilities/structured-outputs (opened). JSON-schema `format`; temperature 0 tip.
[26] ggml-org, llama.cpp release b11242, 2026-09-28. https://github.com/ggml-org/llama.cpp/releases/tag/b11242 (opened). Windows zips, macOS tar.gz assets.
[27] Hacker News comment thread on LM Studio admin install on macOS, 2026-01-29. https://news.ycombinator.com/item?id=46810279 (opened). Anecdotal; [UNVERIFIED].
[28] Google, "Gemma 4 model overview" (memory requirements), updated 2026-07-08. https://ai.google.dev/gemma/docs/core (opened). Q4 memory for E4B/12B.
[29] Google, "Gemini API Additional Terms of Service", effective 2026-03-23. https://ai.google.dev/gemini-api/terms (opened). Unpaid vs paid data use, EEA rules, business-use clause.
[30] OpenAI, "Data controls in the OpenAI platform". https://developers.openai.com/api/docs/guides/your-data (opened). Retention, ZDR, store default, files/batches.
[31] OpenAI, "Data Processing Addendum", effective 2026-01-01. https://openai.com/policies/data-processing-addendum/ (opened). Processor role; customer consent duty §3.1.
[32] Anthropic, "API and data retention". https://platform.claude.com/docs/en/manage-claude/api-and-data-retention (opened). ZDR scope, batch/files/schema retention, consumer exclusions.
[33] Anthropic, "How long do you store my organization's data?" https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data (opened). 30-day standard deletion, 2-year flagged retention.
[34] Anthropic, "Data Processing Addendum", effective 2025-02-24. https://www.anthropic.com/legal/data-processing-addendum (opened). Controller/processor roles.
[35] Data Privacy Stack (Microsoft Presidio), "Presidio". https://data-privacy-stack.github.io/presidio/ (opened). PII detection/anonymisation; no-guarantee warning.
[36] jaraco, "keyring" documentation. https://keyring.readthedocs.io/ (opened). OS keychain / Credential Locker backends.
[37] PagerDuty (Wakefield Research), "Shadow AI Survey", press release 2026-06-11. https://www.pagerduty.com/newsroom/shadow-ai-workplace-survey-2026/ (opened). Vendor-commissioned survey of 1,250 office workers.
[38] European Commission, "eInvoicing in Germany", updated 2025-08-14. https://ec.europa.eu/digital-building-blocks/sites/spaces/DIGITAL/pages/467108886/eInvoicing+in+Germany (opened). EN 16931, XRechnung/ZUGFeRD, receive from 2025, issue 2027/2028.
[39] pdfplumber, PyPI. https://pypi.org/project/pdfplumber/ (opened). Text/table extraction from machine-generated PDFs.
[40] pypdfium2, PyPI. https://pypi.org/project/pypdfium2/ (opened). PDF rendering with bundled prebuilt PDFium wheels.
[41] OWASP GenAI Security Project, "LLM01:2025 Prompt Injection". https://genai.owasp.org/llmrisk/llm01-prompt-injection/ (search result with matching content). Indirect injection via documents.
[42] Thinking Machines Lab, "Defeating Nondeterminism in LLM Inference", 2025-09. https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/ (search result with matching content; also https://simonwillison.net/2025/Sep/11/defeating-nondeterminism/). Temperature 0 is not deterministic on shared endpoints.
[43] Logics-Parsing-Omni Technical Report, arXiv:2603.09677. https://arxiv.org/pdf/2603.09677 (search result with matching content). Reproduces OmniDocBench v1.5 scores for GPT-4o, GPT-5.2, Gemini-3-Pro.
[44] Art. 28 GDPR, "Processor". https://gdpr-info.eu/art-28-gdpr/ (search result). Controller/processor contract requirement.
