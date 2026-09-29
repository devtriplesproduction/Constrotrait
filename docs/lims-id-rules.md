# Wai LIMS ID rules (locked)

- Calendar year.
- Report No: `CMTS/{QR}/{year}/{globalSerial}` one serial for the lab.
- ULR only on NABL TEST REPORT, 19 chars: `TC` + `16212` + YY + 9-digit serial + `F`.
- Non-NABL TEST REPORT: ISO marks, no ULR.
- NABL UID: integer, resets each calendar year.
- Non-NABL UID: `MON-nn` from inward month.
- UID allocated when job card is saved / assigned (`allocate_job_uid`).
- Report No + ULR minted only by `issueReportsForJobAction` (Issue button).
- Assignment complete does **not** issue reports.
- Same-type tests on one job share one ULR / Report No.
- Mixed types or 7-day vs 28-day = separate reports and separate UIDs/ULRs.
- Amendment later: new ULR ending `A`.
- QR seed: QR-16, QR-50, QR-73, QR103, QR280.
- Test-date popup: `tests_due_today` for the logged-in assignee.
