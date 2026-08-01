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

## Hash-verified rater workspace

Use the local workspace CLI so the engineer spends time on causal judgment rather than copying packet IDs or assembling JSON. The tool reads only the frozen packet directory. It verifies the index and every packet hash, refuses unexpected files or subdirectories, stores a resumable draft outside the packet directory, and will not export until all 18 packets have valid ratings. It has no command that accepts compiler results, audit summaries, commits, transcripts, or protected repairs.

From `extension/`:

```powershell
$packetDir = "..\docs\v0.3\results\held-out-rater-packets"
$ratingRoot = Join-Path $env:TEMP "pureflow-r7-expert-a"
New-Item -ItemType Directory -Path $ratingRoot
$workspace = Join-Path $ratingRoot "workspace.json"
$bundle = Join-Path $ratingRoot "expert-a.json"

node scripts/r7-rater.mjs init $packetDir expert-a $workspace
node scripts/r7-rater.mjs next $packetDir $workspace
node scripts/r7-rater.mjs answer $packetDir $workspace <packet-id> yes pass fail none 4 "Reason grounded in the visible diff"
node scripts/r7-rater.mjs status $packetDir $workspace
node scripts/r7-rater.mjs export $packetDir $workspace $bundle
```

`next` prints the next unrated packet, visible diff, and frozen questions. `answer` may be repeated for a packet before export to correct a draft. Put neither the workspace nor the exported bundle inside `$packetDir`; the exact-content check deliberately rejects that. Give each rater a separate scratch directory and stable pseudonymous ID.

After both files are returned, initialize a blind adjudication workspace. It validates both complete bundles, rejects reused identities, copies only exact four-field categorical consensus, and leaves every disagreement pending. `next` shows the frozen packet plus both blinded ratings and the fields that differ; it still has no access to compiler outcomes.

```powershell
$panelRoot = Join-Path $env:TEMP "pureflow-r7-panel"
New-Item -ItemType Directory -Path $panelRoot
$panelWorkspace = Join-Path $panelRoot "workspace.json"
$adjudication = Join-Path $panelRoot "adjudication.json"

node scripts/r7-rater.mjs init-adjudication $packetDir <rater-a.json> <rater-b.json> panel-chair $panelWorkspace
node scripts/r7-rater.mjs next $packetDir $panelWorkspace
node scripts/r7-rater.mjs answer $packetDir $panelWorkspace <packet-id> yes pass fail none 4 "Panel reason grounded in the visible diff"
node scripts/r7-rater.mjs export $packetDir $panelWorkspace $adjudication
```

Resolve all pending disagreements without exposing compiler outcomes. The exported adjudication is a full 18-record third bundle with a distinct panel ID. Then run:

```powershell
cd extension
node scripts/r7-rating.mjs ..\docs\v0.3\results\held-out-rater-packets\index.json <rater-a.json> <rater-b.json> <adjudication.json> <new-summary.json>
```

The join tool verifies the hash-bound packet index, exact coverage, independent rater IDs, categorical values, confidence bounds, and reasons before reporting raw agreement, Cohen's kappa where defined, disagreement count, and adjudicated expert-valid rate. Only then may ratings be joined to the automated held-out summary.
