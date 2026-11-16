#!/usr/bin/env bash
set -euo pipefail
OUT="${1:-docs/evidence}"
mkdir -p "$OUT"
date -u +%Y-%m-%dT%H:%M:%SZ > "$OUT/collected-at-utc.txt"
kubectl -n canary get rollouts.argoproj.io -o wide > "$OUT/rollouts.txt"
kubectl -n canary get pods -o wide > "$OUT/pods.txt"
kubectl -n canary get services -o yaml > "$OUT/services.yaml"
kubectl -n canary get analysisruns.argoproj.io -o yaml > "$OUT/analysisruns.yaml"
kubectl -n canary describe rollout demo-app > "$OUT/rollout-describe.txt"
kubectl -n monitoring get servicemonitors -o yaml > "$OUT/servicemonitors.yaml"
kubectl -n canary get endpointslices -o yaml > "$OUT/endpointslices.yaml"
echo 'Cluster state saved; capture Prometheus/Grafana screenshots manually.'
