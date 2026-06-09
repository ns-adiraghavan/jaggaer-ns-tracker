<!-- uploaded by manager at 2026-06-09T12:57:27.000Z -->
<!-- piece: How to Use Claude to Auto-Generate an RFP from Your Sourcing Brief -->
# JAI Design Standardization — Prompt Pack

**Use:** Standardize any standalone JAGGAER content HTML (myth-busters, whitepaper landings, etc.) to match the JAI demo design language.

**How to run:** Open a chat with Claude, attach the HTML file you want to standardize, and paste **Prompt 1**. When it returns the file, paste **Prompt 2** in the same chat to QA it. The tokens are baked into the prompts, so no other reference file is needed (optionally attach the JAI demo HTML too if you want Claude to match exact component styling).

**The one rule everyone forgets:** the identity is carried by the gradient accent *on a light field* — never by dark/black hero bands. Keep everything dark-text-on-light. Do not introduce dark section backgrounds.

---

## PROMPT 1 — Apply the JAI design system

```
You are restyling the attached HTML to JAGGAER's "JAI" design language. Rewrite ONLY the CSS and class/style usage — do not change the copy, content order, data, sources, or page structure. Return the complete edited HTML file, ready to save.

DESIGN TOKENS (use these exact values; define as :root CSS variables):
  --ink:       #0B0D12   /* primary text */
  --ink-2:     #3a3f4a   /* secondary text */
  --ink-3:     #6a7180   /* tertiary / captions */
  --jai-a:     #5300CE   /* gradient start (purple) */
  --jai-b:     #E22B83   /* gradient end (magenta) */
  --jai-grad:  linear-gradient(90deg,#5300CE 0%,#E22B83 100%)
  --red:       #D22428   /* alternate solid CTA only */
  --teal:      #4D8194   /* solid eyebrow colour option */
  --white:     #fff
  --cream:     #eef0f3   /* tinted surface */
  --light-blue:#E9EFF4
  --border:    1px solid #dce0e8
  --radius:    1rem
  --radius-sm: .5rem

TYPOGRAPHY:
  - Body / UI: Inter (weights 300–800).
  - Display NUMERALS only (big stats, scores, step numbers): Poppins, font-weight 800, letter-spacing -.01em.
  - Large headings (h1/h2/section heads): font-weight 400 (light, editorial) — NOT bold. line-height ~1.15.
  - Eyebrows / kickers: uppercase, font-weight 700, letter-spacing .1em–.14em, .6rem–.75rem. Colour them with --teal OR gradient-clip them (see below).
  - Load fonts: <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">

SIGNATURE TREATMENTS (this is what makes it look like JAI):
  - Gradient-clipped text — apply to eyebrows, big stat numbers, and the key emphasis word(s) in a headline:
      background:var(--jai-grad); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  - Primary buttons: background:var(--jai-grad); color:#fff; font-weight:600; border:none; border-radius:var(--radius-sm); padding:.65rem 1.5rem.
  - Secondary buttons: transparent bg, 1px #dce0e8 border, --ink text.
  - Cards / panels: background:#fff; border:var(--border); border-radius:var(--radius); on hover box-shadow:0 8px 28px rgba(11,13,18,.12).
  - Callout / data panels: background:linear-gradient(135deg,#f8f4ff,#fff4fa); border-left:3px solid var(--jai-a); border-radius:0 var(--radius-sm) var(--radius-sm) 0.
  - Small icon tiles (if any): background:linear-gradient(135deg,#f3ecff,#ffeef7); border-radius:9px.

HARD CONSTRAINTS:
  1. LIGHT FIELD ONLY. Convert every dark/navy/black/steel section background (#1B3A5C, #1a2535, #0f1923, etc.) to #fff or var(--cream). No dark hero. No dark bands. Text stays dark-on-light.
  2. Remove any legacy palette: terracotta/burnt-orange (#c8401a and family) and any serif display font (e.g. Playfair Display). Replace accents with the gradient; replace display serif with the typography rules above.
  3. The gradient is an ACCENT, never a full-section background. Use it for: eyebrows, numerals, 1–2 emphasis words per headline, buttons, and left-border rules. Do not gradient-fill large areas.
  4. Keep it responsive — preserve existing breakpoints/grid behaviour, just restyle.
  5. Do not invent or remove content. Sources, footnotes, stats, and CTAs stay exactly as written.

Return the full HTML. After it, give me a 4–6 line summary of what you changed.
```

---

## PROMPT 2 — Consistency & QA audit

```
Audit the HTML you just produced against the JAI design language and fix anything off. Return the corrected full HTML, then a short checklist of what you found and fixed.

Check and fix:
  [ ] No dark/navy/black/steel section backgrounds remain anywhere (search #1B3A5C, #1a2535, #0f1923, steel, dark). Everything is on #fff or #eef0f3 with dark text.
  [ ] No legacy terracotta/orange (#c8401a family) and no serif display font (Playfair) left in the file.
  [ ] Gradient is used as ACCENT only — eyebrows, numerals, ≤2 emphasis words per headline, buttons, left-borders. Flag and reduce any large gradient fills.
  [ ] Big stat/score numerals use Poppins 800; everything else is Inter.
  [ ] Large headings are weight 400 (light), not bold.
  [ ] Eyebrows are uppercase, 700, tracked-out, small, and coloured with --teal or gradient-clip.
  [ ] Cards/panels: white, 1px #dce0e8 border, radius 1rem.
  [ ] All buttons match: primary = gradient, secondary = bordered.
  [ ] Gradient-clipped text has the full set of properties (-webkit-background-clip:text AND background-clip:text AND -webkit-text-fill-color:transparent) so it renders on all browsers.
  [ ] Text contrast is readable on its surface (no light-grey text on cream).
  [ ] Responsive breakpoints still work — gradient text and numerals don't overflow on mobile.
  [ ] Copy, data, sources, and structure are UNCHANGED from the original.

If everything passes, say so and return the file unchanged.
```

---

### Token quick-reference (for the team's own eyeballing)

| Role | Value |
|---|---|
| Gradient | `linear-gradient(90deg,#5300CE,#E22B83)` |
| Text | `#0B0D12` / `#3a3f4a` / `#6a7180` |
| Surfaces | `#fff` / `#eef0f3` / `#E9EFF4` |
| Border | `1px solid #dce0e8` |
| Body font | Inter | 
| Numeral font | Poppins 800 |
| Heading weight | 400 (light) |
| Radius | `1rem` / `.5rem` |
| Callout bg | `linear-gradient(135deg,#f8f4ff,#fff4fa)` + `border-left:3px solid #5300CE` |
