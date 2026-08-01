# R7 blind expert rating

Two experienced TypeScript engineers rate every packet independently before seeing compiler status or execution outcome. Do not open the held-out result directory, internal plans, Git commits, agent transcripts, or protected repair artifacts while rating.

Each rater returns one bundle containing exactly one record for every `packet-*.json`:

```json
{
  "schemaVersion": 1,
  "protocol": "r7-blind-expert-v1",
  "raterId": "stable-pseudonymous-id",
  "ratings": [
    {
      "packetId": "copied from packet",
      "causalRelevance": "yes | no | uncertain",
      "targetExpected": "pass | fail | uncertain",
      "rewindExpected": "pass | fail | uncertain",
      "leakage": "none | repair | compiler-status | observed-outcome | other",
      "confidence": 1,
      "reason": "one or two sentences grounded in the visible diff"
    }
  ]
}
```

`confidence` is an integer from 1 to 5. A packet is expert-valid only when the adjudicated answer is `causalRelevance=yes`, `targetExpected=pass`, `rewindExpected=fail`, and `leakage=none`. Raters must not execute code or search commit history; this stage measures causal review of the disclosed participant surface, while automated sandbox receipts independently measure behavior.

After both files are returned, compare exact categorical agreement per field and adjudicate disagreements without exposing compiler outcomes. Save the full final 18-record decision as a third bundle with a distinct panel/adjudication ID. Then run:

```powershell
cd extension
node scripts/r7-rating.mjs ..\docs\v0.3\results\held-out-rater-packets\index.json <rater-a.json> <rater-b.json> <adjudication.json> <new-summary.json>
```

The join tool verifies the hash-bound packet index, exact coverage, independent rater IDs, categorical values, confidence bounds, and reasons before reporting raw agreement, Cohen's kappa where defined, disagreement count, and adjudicated expert-valid rate. Only then may ratings be joined to the automated held-out summary.
