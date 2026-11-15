# TV3 - Experiment results (fill from real cluster)

**Status:** NOT EXECUTED. No cluster run or screenshots are claimed.

| Item | Evidence / measured value |
|---|---|
| Date, cluster, image V1 digest | TODO |
| V2 image digest and FAIL=true | TODO |
| Prometheus target UP | TODO (screenshot) |
| Baseline HTTP 5xx / P95 | TODO |
| Canary HTTP 5xx / P95 | TODO |
| AnalysisRun name, result and timestamp | TODO |
| Rollout phase and aborted/rollback event | TODO |
| Stable service endpoints after failure | TODO |
| HTTP 200 sample after recovery | TODO |

Screenshots: save Grafana panels to `docs/images/` and CLI output to `docs/evidence/`.

**Important:** A failed canary AnalysisRun aborts the update and keeps/returns routed traffic to stable; it does not automatically reset the Rollout spec image to V1. Document the actual stable ReplicaSet and routing, and optionally explicitly undo the desired image after verification.
