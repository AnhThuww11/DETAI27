# TV3 - Monitoring and automated canary abort / traffic rollback

## Prerequisites
- Kubernetes cluster, kubectl, Helm 3, nginx ingress controller, Argo Rollouts controller + kubectl argo rollouts plugin.
- Docker image accessible to nodes: `detai27-app:v1` (replace with your registry image); V2 is simulated by changing `FAIL=true` in pod template, which triggers a new ReplicaSet.
- **Coordinate with TV2:** `monitoring/kubernetes/canary-demo.yaml` is a standalone reference rollout, NOT a patch to an existing TV2 rollout. Do not apply it over TV2 manifests blindly.
- `detai27.local` must resolve to the ingress controller (e.g. `curl -H 'Host: detai27.local' http://INGRESS_IP/`).

## 1. Install monitoring
```bash
kubectl apply -f monitoring/kubernetes/namespace.yaml
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring -f monitoring/prometheus/values.yaml --wait
kubectl apply -f monitoring/prometheus/service-monitor.yaml
kubectl -n monitoring port-forward svc/monitoring-kube-prometheus-prometheus 9090:9090
# Separate terminal:
kubectl -n monitoring port-forward svc/monitoring-grafana 3001:80
```
Grafana: http://localhost:3001; default user `admin`, password is configured in values.yaml; **change the demo password** before deployment. Import `monitoring/grafana/detai27-dashboard.json`, choose Prometheus datasource.

## 2. Deploy demo rollout (only if TV2 has no existing rollout)
```bash
# Install Argo Rollouts controller and nginx ingress controller separately first.
# Build and push a reachable image, then replace `detai27-app:v1` in the demo manifest.
kubectl apply -f monitoring/kubernetes/canary-demo.yaml
kubectl apply -f monitoring/analysis-template.yaml
kubectl -n detai27 get pods,svc,ingress
kubectl argo rollouts get rollout detai27-app -n detai27 --watch
```
Argo Rollouts nginx trafficRouting requires the ingress controller and ingress class/host to match. The stable and canary services are dynamically managed by Argo Rollouts. ServiceMonitor adds `traffic_role=stable|canary` from the Service labels. Note that scraping both services can duplicate metrics from overlapping pod sets during transitions; verify distinct service endpoints before interpreting ratios. Stable/canary series are not independent if selectors overlap.

**Do not use `/health` as readiness probe for the injected V2:** it intentionally returns 500, so a bad V2 would never receive traffic and error-rate-based analysis would not test the intended scenario. Demo uses `/metrics` as a readiness and liveness endpoint solely for fault injection.

## 3. Verify metrics and dashboard
In Prometheus, test:
```promql
up{namespace="detai27"}
http_requests_total{namespace="detai27",traffic_role="canary"}
rate(http_requests_total{namespace="detai27",traffic_role="canary",route="/"}[1m])
```
Generate continuous load **through nginx ingress** in another terminal:
```bash
# Example if ingress is exposed on localhost:8080 with correct Host routing:
DELAY=0.1 bash monitoring/scripts/generate-traffic.sh http://detai27.local/ 1800
```
Without continuous requests the analysis can be inconclusive due to missing samples. First confirm the `traffic_role` labels and targets in Prometheus. Avoid making the rollback claim based on a blank graph.

## 4. Trigger bad V2
```bash
# With load running, inject a failure via a pod-template change:
kubectl -n detai27 patch rollout detai27-app --type=strategic \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","env":[{"name":"FAIL","value":"true"}]}]}}}}'
kubectl argo rollouts get rollout detai27-app -n detai27 --watch
kubectl -n detai27 get analysisruns
kubectl -n detai27 describe analysisrun <ANALYSISRUN_NAME>
```
The demo sets 25% weight, waits 45s, then runs analysis (30s initial delay, 5 samples at 30s intervals). Default failure threshold: HTTP 5xx >5% or P95 >0.5s, illustrative **not experimentally calibrated**. Verify results with real requests and tune to your cluster. If `AnalysisRun` fails, the canary update should abort and nginx should route to stable service. For V2, `/` returns 500 and `/metrics` remains 200.

## 5. Verify recovery and capture proof
```bash
kubectl -n detai27 get rollout detai27-app -o yaml
kubectl -n detai27 get endpoints detai27-stable detai27-canary
curl -i http://detai27.local/
bash monitoring/scripts/collect-evidence.sh
```
Expect 200 from stable after aborted rollout. If traffic has not recovered, investigate nginx ingress/controller, Service selectors, and analysis status before reporting success. If you want to revert the **desired manifest** to V1 after abort, use the version-controlled V1 manifest or `kubectl argo rollouts undo detai27-app -n detai27` after checking revision history. Do not confuse abort/traffic rollback with spec revision rollback.

## 6. Screenshots and submission
Save Grafana before/during/after release, Prometheus targets, failed AnalysisRun, Rollout status, and final 200 response. Fill `docs/experiment-results.md` with real timestamps and measured values. `docs/images/` contains a placeholder; no screenshots are fabricated.

## Integration notes
- Existing app metrics: `http_requests_total{method,route,status}` and `http_request_duration_seconds_bucket{method,route,status,le}`.
- Helm chart naming and Prometheus service DNS assume release `monitoring` in namespace `monitoring`.
- For production use, prefer stable per-pod labels or an ingress/service-mesh traffic metric to avoid scrape overlap and ensure traffic-weight accuracy.
