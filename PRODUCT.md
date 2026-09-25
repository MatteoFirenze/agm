# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person: the owner/manager of Vins & Gastronomie Firenze, working alone at an office desktop before each delivery day. They know the Odoo data, the clients, and the product families well; the tool serves an expert who runs the same routine repeatedly, not a newcomer.

## Product Purpose

AGM turns Odoo exports into everything needed to prepare a delivery day, without re-typing:

- import the day's orders — the Odoo « Écriture comptable » and « Tournée devis » exports can be loaded together, or one after the other, and share one board with one entry per invoice/order;
- split those clients across three delivery rounds (tournées) by drag-and-drop;
- print, per tournée, the picking list PDF grouped by storage (wines section plus product-family sections);
- deduct invoiced quantities from the inventory export and download the updated inventory file;
- generate the customer product catalogue (in-stock articles, grouped, priced) from the inventory.

Success: the delivery day is prepared quickly and correctly — every client in the right round, lists that match what was invoiced, and an inventory that reflects what left the stock.

## Positioning

Built around this business's own Odoo exports and routine: it recognises both export formats from their column headers, knows which product families are alcohol/wine (delivered but excluded from totals and inventory), and maps families to the physical storage sections used when picking. A generic spreadsheet or Odoo report does not encode that routine.

## Operating Context

- Input files are `.xlsx`/`.xlsb` exports from Odoo: orders (two formats) and inventory. The detected format is shown after import so the user can confirm the file was read as intended.
- The same client (enseigne) can have several invoices; entries show the invoice/order number to tell them apart. When both export formats are on the board, each entry is tagged Facture or Devis.
- Several files coexist: re-importing a file under the same name refreshes its entries in place, and a single file can be removed without disturbing the others.
- Clients can be removed from the day (trash) and their invoice detail inspected before printing; removed invoices are excluded from inventory deduction.
- A file that matches no known export is refused without touching what is already on the board.
- Outputs are downloads: `Liste.pdf` per tournée, the recalculated inventory workbook, and `catalogue_produits.html`.
- UI language is French and the domain vocabulary is French (tournée, facture, inventaire, catalogue, enseigne).

## Capabilities and Constraints

- Angular 16 single-page app, PrimeNG 16 (messages, dialogs, confirm), Angular CDK drag-and-drop, Bootstrap CSS from CDN; Excel via ExcelJS, PDFs via pdfmake. Built into `docs/` for static hosting.
- Everything runs client-side; no backend, no persistence between sessions. Reset clears the day.
- Exactly three tournées today; all imported clients start in tournée 1.
- Test suite (189 Karma/Jasmine tests, see TESTS.md) covers parsing, grouping, PDF content, inventory update, and catalogue; fixture files are generated with `npm run fixtures`.
- Undecided: whether the number of tournées should become variable.

## Brand Commitments

- The binding brand is **Vins & Gastronomie Firenze**, with its bronze/gold logo (`src/assets/catalogue-logo.png`), used as the catalogue title.
- The Enoteca Italia logo currently shown in the app header is legacy, not a commitment.

## Evidence on Hand

- Logo: `src/assets/catalogue-logo.png`.
- Realistic sample data: generated Excel fixtures in `helpers/fixtures/` (source `src/app/testing/excel-fixtures.ts`), including error cases (missing column, old format).
- No real client data is committed; screenshots and demos must use fixtures.

## Product Principles

1. Trust the numbers: every total, list, and inventory change must be traceable to the imported files, and the tool says clearly what it read, what it skipped, and why.
2. Fit the routine: the daily sequence (import → split → print → update inventory → catalogue) should be obvious and fast for an expert repeating it.
3. Never lose the day's work by accident: destructive actions (remove client, reset) are deliberate and confirmed.
4. Outputs are the product: the PDFs, inventory file, and catalogue must be correct and ready to use as downloaded.
