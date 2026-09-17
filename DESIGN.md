---
name: AGM — Répartition des tournées
description: A powder-coated steel T-card dispatch board for preparing Vins & Gastronomie Firenze's delivery day.
colors:
  encre: "#25221D"
  encre-2: "#57524A"
  encre-3: "#6E695F"
  papier: "#F3F2EE"
  plaque: "#FAF9F6"
  carton: "#FDFCF8"
  blanc: "#FFFFFF"
  tole: "#CBC9C2"
  tole-claire: "#DAD8D2"
  tole-rail: "#B8B6AE"
  tole-bord: "#A3A098"
  t1: "#DDC690"
  t2: "#AFC7BA"
  t3: "#DDB0A2"
  bronze: "#76603D"
  bronze-fonce: "#5F4C2F"
  bronze-voile: "#E8DFCD"
  brique: "#9A3B2E"
  brique-voile: "#F2DFD9"
  vert: "#335C42"
  vert-voile: "#DCE8DF"
  sable-encre: "#6E5314"
  sable-voile: "#F2E8CF"
typography:
  numeral:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.2
  headline-sm:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  body-sm:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.2
  label:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1
  caption:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.3
  card-number:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    letterSpacing: "0.02em"
    fontFeature: "tnum"
  stamp:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    letterSpacing: "0.04em"
    fontFeature: "tnum"
rounded:
  planche: "10px"
  rayon: "8px"
  tete: "6px"
  rayon-petit: "5px"
  plaque: "4px"
  fiche: "3px"
spacing:
  xxs: "0.125rem"
  xs: "0.375rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "0.875rem"
  xl: "1.5rem"
  pas-fiche: "3.75rem"
components:
  bouton:
    backgroundColor: "{colors.carton}"
    textColor: "{colors.encre}"
    typography: "{typography.label}"
    rounded: "{rounded.rayon-petit}"
    padding: "0 0.75rem"
    height: "2rem"
  bouton-hover:
    backgroundColor: "{colors.blanc}"
    textColor: "{colors.encre}"
  bouton-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.encre-3}"
  bouton-principal:
    backgroundColor: "{colors.bronze}"
    textColor: "{colors.blanc}"
    typography: "{typography.label}"
    rounded: "{rounded.rayon-petit}"
    padding: "0 0.75rem"
    height: "2rem"
  bouton-principal-hover:
    backgroundColor: "{colors.bronze-fonce}"
    textColor: "{colors.blanc}"
  bouton-discret:
    backgroundColor: "transparent"
    textColor: "{colors.encre-2}"
    rounded: "{rounded.rayon-petit}"
    padding: "0 0.5rem"
    height: "2rem"
  bouton-discret-hover:
    backgroundColor: "{colors.tole-claire}"
    textColor: "{colors.encre}"
  bouton-danger:
    backgroundColor: "transparent"
    textColor: "{colors.brique}"
    rounded: "{rounded.rayon-petit}"
    height: "2rem"
  bouton-danger-hover:
    backgroundColor: "{colors.brique-voile}"
    textColor: "{colors.brique}"
  bouton-confirmer-destructif:
    backgroundColor: "{colors.brique}"
    textColor: "{colors.blanc}"
    rounded: "{rounded.rayon-petit}"
    padding: "0.5rem 1rem"
  champ-recherche:
    backgroundColor: "{colors.carton}"
    textColor: "{colors.encre}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.rayon-petit}"
    padding: "0 2.25rem 0 2.125rem"
    height: "2.125rem"
  plaque-en-tete:
    backgroundColor: "{colors.plaque}"
    textColor: "{colors.encre}"
    padding: "0 1.5rem"
    height: "3.5rem"
  planche:
    backgroundColor: "{colors.tole}"
    rounded: "{rounded.planche}"
    padding: "0.75rem 0.75rem 0"
  colonne-tete:
    backgroundColor: "{colors.tole-claire}"
    rounded: "{rounded.tete}"
    padding: "0.5rem"
  plaque-numero:
    backgroundColor: "{colors.t1}"
    textColor: "{colors.encre}"
    typography: "{typography.numeral}"
    rounded: "{rounded.plaque}"
    size: "3rem"
  fiche-tete:
    backgroundColor: "{colors.t1}"
    textColor: "{colors.encre}"
    typography: "{typography.card-number}"
    rounded: "{rounded.fiche}"
    height: "1.5rem"
  fiche-corps:
    backgroundColor: "{colors.carton}"
    textColor: "{colors.encre}"
    typography: "{typography.body-sm}"
    padding: "0 0.5rem"
    height: "1.875rem"
  fiche-fantome:
    backgroundColor: "{colors.bronze-voile}"
    rounded: "{rounded.fiche}"
    height: "3.375rem"
  tampon-imprime:
    textColor: "{colors.vert}"
    typography: "{typography.stamp}"
    rounded: "{rounded.plaque}"
    padding: "0.125rem 0.4375rem 0.0625rem"
  tampon-modifie:
    textColor: "{colors.brique}"
    typography: "{typography.stamp}"
    rounded: "{rounded.plaque}"
    padding: "0.125rem 0.4375rem 0.0625rem"
  etape-marque-suivante:
    backgroundColor: "{colors.bronze}"
    textColor: "{colors.blanc}"
    size: "1.375rem"
  etape-marque-faite:
    backgroundColor: "{colors.encre}"
    textColor: "{colors.papier}"
    size: "1.375rem"
  avis-succes:
    backgroundColor: "{colors.vert-voile}"
    rounded: "{rounded.rayon}"
    padding: "0.5rem 0.5rem 0.5rem 0.875rem"
  avis-attention:
    backgroundColor: "{colors.sable-voile}"
    rounded: "{rounded.rayon}"
    padding: "0.5rem 0.5rem 0.5rem 0.875rem"
  avis-erreur:
    backgroundColor: "{colors.brique-voile}"
    rounded: "{rounded.rayon}"
    padding: "0.5rem 0.5rem 0.5rem 0.875rem"
  dialogue:
    backgroundColor: "{colors.carton}"
    textColor: "{colors.encre}"
    rounded: "{rounded.rayon}"
    padding: "1rem 1.25rem 1.25rem"
---

# Design System: AGM — Répartition des tournées

## Overview

**Creative North Star: "Planning à fiches en T"**

The delivery day is a steel T-card dispatch board. Clients are card-stock T-cards slid into slotted rails on a powder-coated warm-grey board; each of the three tournées has its own card-stock colour, printed on the column's numeral plate and on every card head in that column. Printing presses a rubber stamp onto the column head. The owner works this board alone, repeatedly, so density is high and calm: small controls, tabular counts, no decoration that is not a physical part of the board.

The world is built from four materials and nothing else. **Paper** (warm off-whites) is the room and the header plaque. **Steel** (warm greys) is the board face, the column heads and the recessed slot wells. **Card stock** (carton, plus the three tournée stocks) is what gets moved. **Ink** (warm near-black, and the vert/brique/sable stamp inks) is type and state. Firenze bronze is the single accent, reserved for what to do next. The Vins & Gastronomie Firenze giglio, cropped from the brand logo and multiplied into the plaque, is the only image.

The screen reads as a routine left-to-right (a five-station step rail) above a board that fills the remaining height. It rejects the generic kanban of floating white cards on white, and a toolbar of equal buttons: every action lives in the step or column it belongs to. The legacy burgundy Enoteca Italia look is retired and is not part of this system. The generated customer catalogue (`catalogue_produits.html`) is a separate output with its own inline warm-neutral and bronze palette; it shares the brand, not these tokens.

**Key Characteristics:**
- Warm-grey steel board with recessed, ruled slot rails at a fixed card pitch.
- T-cards: full-width coloured head carrying the invoice number, narrower carton body carrying the client name.
- Three tournée stocks (sable, vert-de-gris, brique rosé) used only to identify rounds.
- Bronze only on the next routine step and the live drop slot.
- Barlow for all reading; Barlow Condensed only for things stamped or printed onto the board.
- Rubber-stamp status marks, slightly rotated, pressed in with a short scale animation.
- One authored stroke icon set on a 24 grid.

## Colors

A warm, low-chroma palette of paper, steel and card stock, with one bronze accent and three stamp inks.

### Primary
- **Firenze Bronze** (`bronze`): fill of the next action's button, the next step's marker (with a `bronze-voile` 3px halo), the dashed border of the live drop slot, the global focus outline, and the "Vins & Gastronomie Firenze" wordmark in the header. White text on it.
- **Deep Bronze** (`bronze-fonce`): hover state of bronze buttons only.
- **Bronze Veil** (`bronze-voile`): fill of the drop-slot placeholder, the next-step halo, and text selection.

### Secondary: tournée stocks
- **Sable Stock** (`t1`): tournée 1 numeral plate, card heads, and its pastille in the step rail.
- **Vert-de-gris Stock** (`t2`): tournée 2, same three places.
- **Brique Rosé Stock** (`t3`): tournée 3, same three places.

Columns expose the stock as a local custom property (`--tc`) so plate and card heads recolour together; a card dragged into another column takes that column's stock.

### Tertiary: stamp inks
- **Registre Green** (`vert`) on **Green Veil** (`vert-voile`): the « Imprimé » stamp, success notices and their icon.
- **Brique** (`brique`) on **Brique Veil** (`brique-voile`): the « Modifié depuis impression » stamp, error notices, the reset action, the remove-card hover, and the destructive confirm button.
- **Sable Ink** (`sable-encre`) on **Sable Veil** (`sable-voile`): warning notices.

### Neutral
- **Ink** (`encre`): all primary text, done-step markers, the found-card outline.
- **Ink 2** (`encre-2`): secondary text, counts, icons in inputs, info-notice icon, hover border of outline buttons.
- **Ink 3** (`encre-3`): waiting steps, placeholders, disabled button text, footer.
- **Papier** (`papier`): page background and footer; hover fill for quiet icon buttons on carton.
- **Plaque** (`plaque`): header plaque and info notices.
- **Carton** (`carton`): card bodies, outline buttons, search field, dialogs.
- **Blanc** (`blanc`): text on bronze and brique fills; hover fill of card bodies and outline buttons.
- **Tôle** (`tole`): the board face, with a white top sheen fading over 18rem.
- **Tôle Claire** (`tole-claire`): column heads, header and dialog hairlines, discreet-button hover, disabled search field.
- **Tôle Rail** (`tole-rail`): connector lines between steps in the rail.
- **Tôle Bord** (`tole-bord`): borders of outline buttons and the search field, dashed empty-slot outline, step-number rings, scrollbar thumb.

### Named Rules
**The Bronze-Is-Next Rule.** Bronze fills only the next step of the routine: that step's marker and its action button. When the next step is per tournée (printing), every non-empty column not yet printed carries a bronze Imprimer; printed columns fall back to outline. Every other button is carton outline, quiet or brique text.

**The Column Stock Rule.** `t1`, `t2` and `t3` identify tournées and nothing else: numeral plate, card heads, rail pastilles. They never signal status and never decorate.

**The Stamp Ink Rule.** State is carried by paired ink and veil: vert for printed and success, brique for changed-since-print and destructive, sable for warnings. The ink colours the text and icon, the veil fills the ground.

## Typography

**Display Font:** Barlow Condensed 600/700 (with Barlow, system-ui)
**Body Font:** Barlow 400/500/600 (with system-ui, -apple-system, Segoe UI), self-hosted via @fontsource
**Label Font:** Barlow

**Character:** Barlow is the ink of a practical working document; Barlow Condensed is the serigraphed numeral and the stamp, narrow and heavy like figures printed onto steel and card.

### Hierarchy
- **Numeral** (Condensed 700, 2.25rem, line-height 1, tabular): the tournée numeral in its 3rem plate.
- **Title** (600, 1.0625rem, 1.2): dialog titles (card back, confirmations).
- **Headline Small** (600, 0.9375rem, 1.2): the screen title in the header and step names in the rail.
- **Body** (400, 15px, 1.4): base text; notice detail capped at 75ch.
- **Body Small** (500, 0.875rem): client names on card bodies, column titles, search input.
- **Label** (600, 0.875rem, line-height 1): button text.
- **Caption** (400, 0.8125rem, 1.3): step state, column counts, file names, search result count; 0.75rem/600 for the detected file format and table headers.
- **Card Number** (Condensed 600, 0.875rem, 0.02em, tabular): invoice number on card heads.
- **Stamp** (Condensed 700, 0.8125rem, 0.04em, uppercase, tabular): « Imprimé HH:MM » and « Modifié depuis impression ».

### Named Rules
**The Stamped-Is-Condensed Rule.** Barlow Condensed is reserved for marks that are physically printed onto the board or a card: plate numerals, step numbers, invoice numbers, stamps. Anything read as running UI (names, buttons, states, notices) is Barlow.

**The Tabular Count Rule.** Every number that is counted or compared (fiches, tournées imprimées, quantities, step numerals, invoice numbers) uses tabular figures.

**The Uppercase Stamp Rule.** Uppercase tracking belongs to rubber stamps only. Headings, step names and column titles stay in sentence case.

## Layout

A full-height column shell: header plaque (3.5rem), a page area with a 1.5rem side gutter, footer. Inside the page, the step rail sits on top as a five-column grid (gap 0.75rem 1rem) with the reset action set apart at the far right; persistent notices follow; the board then takes all remaining height (flex, min-height 0), so on desktop only the slot rails scroll, not the page.

The board is a search strip followed by three equal columns (`repeat(3, minmax(0, 1fr))`, gap 0.75rem). Each column is a 4rem-min steel head over a scrolling slot rail. Cards are 3.375rem tall with 0.375rem between them, landing on a 3.75rem ruled pitch (`pas-fiche`) that the rail prints as a background and scrolls with the content.

Spacing is tight and small-stepped: 0.125, 0.375, 0.5, 0.75, 0.875 and 1.5rem cover nearly every gap. Controls are 2rem tall; the search field 2.125rem.

Responsive behaviour: at 1180px the rail wraps to three columns; at 900px the page scrolls instead of the rails, the rail stacks above the reset action in two columns, the board becomes a rounded standalone panel and columns stack to one; at 640px the header drops the house name and separator and notices wrap their detail under the summary; at 560px steps go single-column and the column head reflows with the stamp on its own line.

## Elevation & Depth

Depth is physical and mostly goes inward. The board is a flat steel face with a faint white top sheen and a 1px inner edge; slot rails are recessed wells (`inset 0 3px 5px`) with printed rules; column heads catch a 1px highlight on their top edge. Card stock sits on the rail with a small contact shadow. Only two things truly lift: a dragged card and a dialog.

### Shadow Vocabulary
- **Fiche contact** (`filter: drop-shadow(0 1px 0 rgba(37,34,29,.14)) drop-shadow(0 1.5px 2px rgba(37,34,29,.16))`): T-cards at rest; drop-shadow so the T silhouette casts, not its bounding box.
- **Fiche lifted** (`filter: drop-shadow(0 12px 14px rgba(37,34,29,.26)) drop-shadow(0 3px 4px rgba(37,34,29,.18))`): the drag preview, which also tilts -1.5deg.
- **Ombre levée** (`box-shadow: 0 14px 28px rgba(37,34,29,.24), 0 3px 8px rgba(37,34,29,.16)`): dialogs over a `rgba(37,34,29,.45)` mask.
- **Slot well** (`box-shadow: inset 0 3px 5px rgba(37,34,29,.12)`): the recessed rail; adds `inset 0 0 0 2px rgba(37,34,29,.22)` while a drag is in progress.
- **Button seat** (`box-shadow: 0 1px 0 rgba(37,34,29,.06)`): outline buttons; they press down 1px on active.

### Named Rules
**The Only-Drag-Lifts Rule.** Nothing on the board floats. A card rises off its rail only while it is being dragged; at rest it is seated, and the settle back uses 220ms on the exit curve.

**The Recessed Slot Rule.** Wells and rails are inset; plates and heads are highlighted at the top edge. Depth reads as pressed steel, never as stacked floating panels.

## Shapes

Small radii graded by material, largest for the biggest steel part: board 10px (top corners only on desktop), dialogs and notices 8px, column heads 6px (top), controls 5px, numeral plates and stamps 4px, card heads 3px with the body squared into them (2px bottom corners). The T-card silhouette is structural: the body is inset 0.625rem on each side under the full-width head. Step markers are circles. Rail pastilles are 0.5rem squares with 2px corners. Dashed outlines appear only for slots: the empty-slot hint (1.5px, `tole-bord`) and the live drop slot (2px, `bronze`). Stamps carry a 1.5px current-colour border and sit rotated -2.5deg.

Icons are one authored set (`svg[icone]`): 24-unit grid, no fill, 1.75 stroke in current colour, round caps and joins, sized 0.8125–1rem; step and stamp checks thicken to 2.75–3.

## Components

### Buttons
Compact, seated, pressable.
- **Shape:** gently cornered (`rayon-petit`), 2rem tall, icon + label with 0.375rem gap.
- **Outline (default):** carton fill, 1px `tole-bord` border, ink label, 1px seat shadow. Hover: white fill, `encre-2` border. Active: moves down 1px. Disabled: transparent, `tole-claire` border, `encre-3` label, not-allowed cursor.
- **Principal:** bronze fill and border, white label; hover deep bronze. Applied by state to whichever button is the next step (see The Bronze-Is-Next Rule), never fixed in markup.
- **Discret:** transparent, `encre-2`; hover `tole-claire` fill. Used when an action has already been done once (« Changer » the inventory file).
- **Danger:** transparent, brique label; hover `brique-voile`. The reset action, held apart at the end of the rail.
- **File inputs** are styled as buttons: a transparent input covers the label so it stays keyboard-reachable; focus of the inner input rings the whole button in bronze.
- **Transitions:** background, border and colour at 150ms on the exit curve.

### Step Rail
The routine as five stations. Each station: a 1.375rem circular marker with its number in Condensed 700 (ring `tole-bord` when pending, filled ink with a check when done, bronze with a `bronze-voile` halo when next), the step name, a hairline running to the next station, and beneath it the station's own buttons and state text (loaded file name, detected format, counts with tournée pastilles). Waiting steps dim their name to `encre-3`. The next station also carries `aria-current="step"`.

### Board and Slot Columns
- **Board:** `tole` face, 0.75rem padding, sheen and inner edge; holds the search strip and the three columns.
- **Column head:** `tole-claire`, 6px top radius, 4rem min height: numeral plate, « Tournée » title with count, stamp, Imprimer button.
- **Numeral plate:** 3rem square in the column stock, 4px radius, inner hairline and bottom shade, big Condensed numeral.
- **Slot rail:** recessed `#C4C2BA` well with ruled pitch lines; the empty state is a dashed hint card with a bold first line.

### T-Card (Signature)
- **Head:** 1.5rem, column stock, top highlight; drag grip (six dots), invoice number, then detail and remove icon buttons (1.5 × 1.375rem, 3px radius, hover white 60% veil; remove hovers brique).
- **Body:** 1.875rem carton strip inset under the head, client name in Body Small with ellipsis; turns white on card hover.
- **Drag:** grab cursor; preview lifts and tilts; placeholder is a bronze dashed slot on `bronze-voile` with a soft bronze halo; siblings slide on 220ms.
- **Search:** matching cards get a 1.5px ink outline traced around the T silhouette; all other cards fade to 40%. Search highlights, never filters.

### Stamps
- **Imprimé:** vert ink on a translucent green veil, check icon plus print time.
- **Modifié depuis impression:** brique ink on a translucent brique veil.
- Condensed uppercase, 1.5px current-colour border, -2.5deg, pressed in over 280ms (scale 1.4 → 1, fade in).

### Inputs / Fields
- **Search:** carton, 1px `tole-bord`, 5px radius, 2.125rem, leading search icon, trailing clear button once text exists; width up to 23rem.
- **Focus:** border shifts to `encre-2` with a 3px `rgba(37,34,29,.12)` ring. Escape clears.
- **Disabled:** `tole-claire` fill, `tole-rail` border (before import).

### Notices
PrimeNG messages restyled as borderless 8px strips in a four-column grid (icon, bold summary, detail capped at 75ch, 2rem close). Info: plaque with a `tole-claire` inner hairline; success, warning and error: their veil with a darkened ink of the same hue. Persistent until closed; on narrow screens detail wraps under the summary.

### Navigation
The header plaque: 3.5rem, `plaque` fill, `tole-claire` bottom hairline; the cropped giglio (multiplied onto the plaque), the house name in bronze 500, a 1px separator, the screen title, and today's date right-aligned in `encre-2`.

### Dialogs
The card back and confirmations: carton surface, 8px radius, `ombre levée`, header with a `tole-claire` hairline and 600 title, quiet close icon. The detail table uses 0.75rem/600 headers, right-aligned tabular quantities, and hairline row rules. Confirm footers hide PrimeNG's button icons: reject is an outline button, accept is a solid brique button; their focus is a carton gap ring plus a bronze ring.

## Do's and Don'ts

### Do:
- **Do** put every action inside the step or column it belongs to, and let state decide which one is bronze.
- **Do** carry a tournée's identity only through its stock colour and its Condensed numeral, applied through the column's local `--tc`.
- **Do** use the `svg[icone]` set (24 grid, 1.75 stroke, current colour) for every new pictogram, drawing new paths in the same style.
- **Do** restyle any new PrimeNG component into these tokens (Barlow, carton/steel surfaces, `rayon` radii, bronze focus) before it ships.
- **Do** show state with a stamp or a paired ink-and-veil notice, and keep counts in tabular figures.
- **Do** use the exit curve `cubic-bezier(0.16, 1, 0.3, 1)` at 120–280ms, and respect reduced motion.
- **Do** keep destructive actions brique and confirmed through the carton dialog.

### Don't:
- **Don't** float white cards on a white canvas or lay actions out as a toolbar of equal buttons.
- **Don't** spend bronze on anything that is not the next step, the live drop slot or focus.
- **Don't** use `t1`–`t3` for status, alerts or decoration.
- **Don't** set running UI text in Barlow Condensed, or put uppercase tracked labels above headings; uppercase belongs to stamps.
- **Don't** make cards float at rest; lift is for dragging and dialogs.
- **Don't** use icon fonts or PrimeNG's `pi` glyphs in app markup.
- **Don't** reintroduce the Enoteca Italia logo, the burgundy palette, or PrimeNG Lara blue.
