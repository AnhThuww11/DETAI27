#!/usr/bin/env bash
set -euo pipefail
mkdir -p docs/evidence
kubectl -n detai27 get rollouts.argoproj.io -o wide > docs/evidence/rollouts.txt
kubectl -n detai27 get pods -o wide > docs/evidence/pods.txt
kubectl -n detai27 get services -o wide > docs/evidence/services.txt
kubectl -n detai27 get analysisruns.argoproj.io -o yaml > docs/evidence/analysisruns.yaml
kubectl -n detai27 describe rollout detai27-app > docs/evidence/rollout-describe.txt
printf 'Saved live cluster evidence. Capture Grafana screenshots manually in docs/images/.\n'
