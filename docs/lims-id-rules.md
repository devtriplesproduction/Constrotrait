# LIMS ID rules (developer)

- JOB uid: job_entries.uid (one per job card)
- ULR: one per NABL certificate (all in-scope tests on that job that share an issue), not per test
- Format: TC + 5-digit certificate + FY + 8-digit seq + F|A
  Example Wai TC-16212 FY26 seq 87: TC162122600000087F
- Non-NABL tests: no ULR; qc_number QC-WAI-YY-######
- Mixed job: NABL tests share one ULR; other tests get QC only
- Do not generate ULR at booking; generate at issue / generate_ulr_for_date
