# TV3 – Monitoring + Automatic Canary Abort (integrated with TV1 / TV2)

## Existing architecture and safety

- TV1 Node.js Express: `/`, `/health`, `/metrics`, port `3000`; original `http_requests_total{method,route,status}` and `http_request_duration_seconds_bucket{method,route,status,le}`. `FAIL=true` makes `/` and `/health` return `500`; `/metrics` stays accessible.
- TV2: `canary/demo-app`, Service `demo-app-stable`, `demo-app-canary`, Ingress `demo-app-ingress` (`Host: canary.local`). Existing 5 → 25 → 50 → 100 weight steps preserved.
- CI workflow of TV1 uses `jzat11/detai27-app:latest` and `jzat11/detai27-app:sha-<git-sha>`. **The uploaded repository does not prove Docker Hub contains explicit `v1` / `v2` tags.** This integration uses `latest` as the base image and creates a fresh pod-template revision with `FAIL=true` for the faulty release. Pin to a verified immutable SHA tag for repeatable tests.
- TV2 edits in this integration are limited to: Service metadata labels, named Service ports `http`, Rollout initial image and `imagePullPolicy`, and starting analysis at first 5% step. Review these before cherry-picking into TV2 branch.
- Do NOT deploy the former standalone `monitoring/kubernetes/canary-demo.yaml`. It was removed from the integrated package. Do NOT deploy `k8s/canary/podmonitor.yaml` at the same time as the new ServiceMonitor: that would double-scrape the same pod. If a PodMonitor exists from an earlier deployment, remove only that `canary/demo-app` PodMonitor after coordinating with TV2.
- The canary Service and stable Service selectors are managed by Argo Rollouts; never manually override them. Service metadata labels only support scraping and do not set traffic weights.

## 1. Prerequisites / installation

Minikube, Docker runtime, `kubectl`, Helm 3, NGINX ingress addon, Argo Rollouts CRDs/controller/plugin. From repository root:

```bash
minikube start --cpus=4 --memory=6144 --driver=docker
minikube addons enable ingress
# Install Argo Rollouts CRDs/controller according to docs/setup-local.md if not installed.
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
# Replace the demonstration password locally; do not commit credentials.
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring -f monitoring/prometheus/values.yaml \
  --set grafana.adminPassword='SET_A_STRONG_LOCAL_PASSWORD' --wait
kubectl apply -f k8s/canary/service.yaml
kubectl apply -f k8s/canary/rollout.yaml
kubectl apply -f monitoring/prometheus/service-monitor.yaml
kubectl apply -f monitoring/analysis-template.yaml
kubectl -n monitoring get servicemonitor demo-app
kubectl -n canary get rollout demo-app
```

**Order caution:** ServiceMonitor and AnalysisTemplate should be installed before starting a new rollout test. On the first installation of an already running TV2 release, prefer applying Monitoring first and re-applying TV2 manifests only after reviewing changes. Do not overwrite the running cluster without coordination.

If old `PodMonitor` is present, compare with TV2 and then remove it intentionally (`kubectl -n canary delete podmonitor demo-app`) before relying on role-tagged ServiceMonitor metrics.

## 2. Port-forward and Targets

Use separate terminals:

```bash
kubectl -n monitoring port-forward svc/monitoring-kube-prometheus-prometheus 9090:9090
kubectl -n monitoring port-forward svc/monitoring-grafana 3001:80
kubectl -n ingress-nginx port-forward svc/ingress-nginx-controller 8081:80
```

Prometheus: http://127.0.0.1:9090/targets ; Grafana: http://127.0.0.1:3001/ (user admin, your chosen password).

Prometheus queries (choose Graph / Table):

```promql
up{namespace="canary",service=~"demo-app-(stable|canary)"}
sum by (traffic_role) (rate(http_requests_total{namespace="canary",route="/"}[1m]))
sum by (traffic_role) (rate(http_requests_total{namespace="canary",route="/",status=~"5.."}[1m]))
histogram_quantile(0.95, sum by (le,traffic_role) (rate(http_request_duration_seconds_bucket{namespace="canary",route="/"}[1m])))
```

Target labels `traffic_role=stable|canary` are copied from Service metadata, `namespace=canary` from Kubernetes namespace metadata. Targets must be UP and **should not show duplicate jobs for the same underlying pods**. Stable and canary services usually reach distinct ReplicaSets, but verify EndpointSlices during transitions. Do not compare their rates to ingress traffic weights if services overlap or scrapes are duplicated.

In Grafana, import `monitoring/grafana/detai27-dashboard.json`; choose Prometheus datasource. It provides error rate, P95, request throughput, target UP, and 15-minute request count by role. Save screenshot from real data.

## 3. Run a failing canary and confirm automated abort

Start with a confirmed healthy baseline (`FAIL=false`); ensure Argo Rollout is Healthy and requests return 200. Start a continuous ingress load in a *separate terminal*:

```bash
DELAY=0.05 bash monitoring/scripts/generate-traffic.sh http://127.0.0.1:8081/ 0 | tee canary-traffic.log
```

Check that Prometheus shows actual **canary** traffic after rollout begins. A small 5% traffic share needs enough requests to produce a valid 1-minute rate. The AnalysisTemplate intentionally fails closed when request rate is below 0.05 req/s or metrics are missing; increase request rate if a healthy canary would be falsely aborted by low sample volume.

Capture the starting Rollout revision and stable image, then create a new pod-template revision of TV1 app with `FAIL=true`:

```bash
kubectl -n canary get rollout demo-app -o yaml > rollout-before-test.yaml
kubectl -n canary set env rollout/demo-app FAIL=true
kubectl argo rollouts get rollout demo-app -n canary --watch
# Another terminal:
kubectl -n canary get analysisruns.argoproj.io -w
kubectl -n canary get analysisruns.argoproj.io -o yaml
kubectl -n canary describe rollout demo-app
```

**Important:** `kubectl set env rollout/...` might not be supported by all kubectl versions for Rollout CRDs. If it fails, use:

```bash
kubectl -n canary patch rollout demo-app --type=strategic \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","env":[{"name":"PORT","value":"3000"},{"name":"FAIL","value":"true"}]}]}}}}'
```

Do not change health readiness to `/health` for the intentionally bad V2: it returns 500 and would prevent routing any traffic to the canary. Existing TV2 TCP readiness allows the test to exercise real HTTP 500 responses.

**Expected, NOT pre-verified:** Prometheus sees canary 500s; AnalysisRun becomes `Failed`; Rollout is `Degraded` or `Aborted` depending on version/status display; Argo Rollouts sends ingress traffic back to stable. The 5xx threshold is 5% and P95 is 0.5 seconds. Missing traffic/series must not yield an automatic pass. This is a traffic abort, not necessarily a Git manifest or revision rollback.

## 4. Prove recovery

```bash
kubectl -n canary get ingress -o yaml
kubectl -n canary get services demo-app-stable demo-app-canary -o yaml
kubectl -n canary get endpointslices -o wide
# Run repeatedly and store responses; include Host routing:
for i in $(seq 1 30); do curl -s -o /dev/null -H 'Host: canary.local' -w '%{http_code}\n' http://127.0.0.1:8081/; done
bash monitoring/scripts/collect-evidence.sh
```

Expected after successful abort: 30/30 HTTP 200 through public ingress (under the tested sample), analysis Failed, and stable Service endpoint points at V1. If responses still include 500, investigate before claiming success. Do not call a manually executed `kubectl argo rollouts abort` an automatic rollback. If needed, restore desired state from the reviewed V1 rollout manifest or a revision-aware `kubectl argo rollouts undo`; this is a **separate**, manual action.

## 5. Evidence checklist

Save actual screenshots to `docs/images/` (Targets UP, 5xx/P95 PromQL, Grafana baseline and failure, Failed AnalysisRun, Rollout aborted/degraded, restored HTTP 200). Save command outputs in `docs/evidence/` with `collect-evidence.sh` and fill the empty TV3 table in `docs/experiment-results.md` with measured values and UTC time. The bundled ZIP does **not** contain proof of an actual Minikube execution of this TV3 integration.

## 6. Merge notes

Review `k8s/canary/service.yaml` and `k8s/canary/rollout.yaml` changes with TV2. Only commit TV3 integration changes; leave TV1 source and Blue-Green configs untouched. Suggested branch: `tv3`.
