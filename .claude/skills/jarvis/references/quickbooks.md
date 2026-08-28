# QuickBooks playbook

The TMS knows what was hauled. QuickBooks knows what was billed, what was
collected, and what is owed. The money questions all live here.

Tools worth knowing: `mcp__Intuit_QuickBooks__qbo_accounting_get_ar_aging_summary`
and `..._detail`, `qbo_accounting_get_ap_aging_summary` / `..._detail`,
`qbo_sales_get_invoices`, `qbo_contact_search_customer`,
`qbo_accounting_get_sales_by_customer_summary`, `profit_loss_generator`,
`cash_flow_generator`, `qbo_sales_send_invoice_reminder`.

## Receivables — who owes us

Start with **AR aging summary** for the shape of the problem (current, 1–30,
31–60, 61–90, 90+), then **AR aging detail** for the individual invoices behind
whichever bucket is ugly. Summary first: the detail report is long and usually
only one bucket is worth reading.

Lead with the number that changes behavior: total past due, and the single
largest past-due invoice. Not the full table.

## Payables — what we owe

**AP aging summary** for carrier and vendor obligations. The pairing that
matters in brokerage: money going out to a carrier on a load whose customer
hasn't paid us yet. If Rogelio is looking at cash, that pairing is the answer he
actually wants.

## Matching an invoice to a load

QuickBooks and the TMS are separate systems with no shared key, so match in this
order:

1. **Customer name** — `qbo_contact_search_customer` against `tms.mjs customers`.
   Names rarely match character-for-character ("Acme Corp" vs "Acme Corporation");
   match on the distinctive word, then confirm with a second signal.
2. **Amount** — invoice total against the order's `totalCost`.
3. **Date** — invoice date near the shipment's `deliveredAt`.

Two of the three agreeing is a match. One alone is a guess — say it's a probable
match and name which signals lined up.

## The rule that prevents the embarrassing call

**Never chase an invoice for a load that hasn't delivered.** Before flagging
anything as collectable, confirm in the TMS that the shipment reached
`DELIVERED`. An invoice that looks past due on a load still `IN_TRANSIT` is a
billing error on our side, not a late payment on theirs — and chasing it burns
credibility with a customer who is not, in fact, late.

The same check in reverse is worth running unprompted: shipments that reached
`DELIVERED` with no corresponding invoice in QuickBooks is revenue nobody
billed. That query is usually worth more than the collections list.

## Reporting

`profit_loss_generator` and `cash_flow_generator` for period questions. State
the period explicitly in the answer — "August month-to-date", not "this month" —
because month-to-date and full-month numbers differ enough to matter, and a
comparison against the wrong baseline is how a good month gets read as a bad one.

## What Jarvis does not do

Create, edit, void, or send invoices; send payment reminders; change customer
records. All of it is read-only reporting plus a draft for Rogelio to approve.
`qbo_sales_send_invoice_reminder` reaches a real customer's inbox — it is a send,
and the never-send rule in `messaging.md` covers it.
