# Kết quả thử nghiệm Blue-Green và Canary

## 1. Môi trường thực nghiệm

| Thành phần | Phiên bản / cấu hình |
|---|---|
| Hệ điều hành | Windows 11, Docker Desktop |
| Minikube | v1.39.0 (driver Docker) |
| Kubernetes | v1.37.0 |
| Argo Rollouts plugin | v1.10.2 |
| Ingress | NGINX Ingress Controller v1.15.1 (addon của Minikube) |
| Công cụ tải | k6 v2.4.0 |
| Ứng dụng | `demo-app` (Node.js, Express, prom-client), cổng 3000 |

- V1: bình thường, trả HTTP 200.
- V2 lỗi: đặt biến môi trường `FAIL=true`, trả HTTP 500 ở `/` và `/health`.
- Truy cập ingress từ máy host bằng `kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8081:80`
  và header `Host` (cổng 80 của máy đang bị ứng dụng khác chiếm).
- Cách phân biệt phiên bản: mã trạng thái (200 là V1, 500 là V2 lỗi).

## 2. Blue-Green

Cấu hình: `k8s/blue-green/`, 3 replica, `autoPromotionEnabled: false`, `scaleDownDelaySeconds: 600`.

| Bước | Lệnh | Kết quả quan sát | Ảnh |
|---|---|---|---|
| 1. Chạy V1 | `kubectl apply -f k8s/blue-green/` | Rollout Healthy, `bg.local` trả 200 | `images/bg-1-v1-healthy.png` |
| 2. Phát hành V2 lỗi (preview) | sửa image `v2`, `FAIL=true`, apply | Rollout Paused; active (V1) trả 200, preview (V2) trả 500 | `images/bg-2-preview.png` |
| 3. Promote | `kubectl argo rollouts promote` | Active chuyển sang V2, `bg.local` trả 500 | `images/bg-3-promoted.png` |
| 4. Rollback | `kubectl argo rollouts undo` | `bg.local` trả 200 trở lại, V1 `stable, active` | `images/bg-4-rollback.png` |

- Thời gian rollback (từ lúc `undo` đến khi trả 200): **5 giây** (đo bằng vòng lặp kiểm tra mỗi 0,5 giây).
- Nhận xét: trong lúc V2 ở trạng thái preview, người dùng vẫn gọi V1 nên không bị ảnh hưởng.
  Sau promote, 100% traffic sang V2 ngay lập tức; do V1 vẫn được giữ trong 10 phút nên rollback gần như tức thì.
- Chi phí tài nguyên: trong lúc chuyển đổi có tối đa 6 pod (gấp đôi 3 replica).

## 3. Canary

Cấu hình: `k8s/canary/`, 4 replica, các bước 5% → 25% → 50% → 100%, định tuyến bằng NGINX Ingress
(annotation `canary-weight`). Mỗi mốc dừng để đo, mỗi lần đếm 200 request.

### 3.1 V2 lỗi (`FAIL=true`)

| Mốc đặt | `canary-weight` | Số phản hồi 200 (V1) | Số phản hồi 500 (V2) | Tỷ lệ V2 thực tế | Ảnh |
|---|---|---|---|---|---|
| 5% | 5 | 187 | 13 | 6,5% | `images/canary-1-weight-5.png` |
| 25% | 25 | 154 | 46 | 23% | `images/canary-2-weight-25.png` |
| 50% | 50 | 107 | 93 | 46,5% | `images/canary-3-weight-50.png` |

- Tỷ lệ thực tế lệch nhẹ so với mốc đặt do NGINX chia theo xác suất.
- Số pod canary tăng theo mốc (1 pod ở 5% và 25%, 2 pod ở 50%).
- Rollback thủ công (`kubectl argo rollouts abort`) ở mốc 25%: weight về 0, toàn bộ 200 request trả 200.
  Ảnh: `images/canary-abort.png`.

### 3.2 V2 tốt (`FAIL=false`)

Đi hết các bước đến 100%: Rollout Healthy, `demo-app:v2 (stable)`, 200/200 request trả 200.
Ảnh: `images/canary-4-weight-100.png`.

## 4. Kiểm thử tải bằng k6 (không có phân tích tự động)

Kịch bản `load-test/script.js`: 10 người dùng ảo, gọi `/` liên tục, V2 lỗi được phát hành theo các bước Canary.

| Chỉ số | Giá trị |
|---|---|
| Thời gian chạy | 6 phút |
| Tổng request | 33.992 (khoảng 94 request/giây) |
| Phản hồi 200 | 16.390 (48,2%) |
| Phản hồi 500 | 17.602 (51,78%) |
| Độ trễ trung bình / p(95) | 5,27 ms / 15,19 ms |
| Ảnh | `images/k6-result.png` |

Số liệu nền của V1 (lần chạy 10 giây, chưa phát hành V2): 947 request, 0% lỗi, p(95) khoảng 17,7 ms.

Nhận xét: do chưa có cơ chế phân tích, Rollout tiếp tục qua các bước theo thời gian và bản lỗi đã lan đến toàn bộ
người dùng (hơn một nửa request thất bại). Đây là lý do cần AnalysisTemplate để tự động dừng và rollback.

## 5. Rollback tự động với AnalysisTemplate (phối hợp TV3)

TODO: ghi tên AnalysisTemplate, metric, ngưỡng, kết quả AnalysisRun (Failed), thời gian từ lúc phát hành V2 đến lúc
Rollout bị hủy, xác nhận traffic quay về V1.

## 6. So sánh Blue-Green và Canary

| Tiêu chí | Blue-Green | Canary |
|---|---|---|
| Cách chuyển traffic | Chuyển toàn bộ cùng lúc | Tăng dần 5% → 25% → 50% → 100% |
| Thời gian quay lại V1 | 5 giây (`undo`) | Tức thì khi `abort` (weight về 0) |
| Tài nguyên | Gấp đôi (6 pod cho 3 replica) | Thêm 1 đến 2 pod canary |
| Mức ảnh hưởng khi V2 lỗi | 100% người dùng sau promote | Chỉ phần traffic của canary (5% đến 50%) |
| Kiểm thử trước khi nhận traffic | Có (preview service) | Có (canary nhỏ) |
| Điều kiện kỹ thuật | Chỉ cần 2 Service | Cần bộ định tuyến lưu lượng (NGINX) |
| Độ phức tạp cấu hình | Thấp | Cao hơn |
| Phù hợp khi | Cần chuyển phiên bản nhanh, rõ ràng | Muốn giảm rủi ro, kiểm chứng bằng metric |

## 7. Vấn đề gặp phải và cách xử lý

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| `curl` tới `127.0.0.1` trả 302 | Cổng 80 của máy bị Apache chiếm | Dùng `kubectl port-forward` tới ingress-nginx trên cổng 8081 |
| Pod V2 không bao giờ Ready nếu dùng `/health` làm readinessProbe | `/health` trả 500 khi `FAIL=true` | Dùng `tcpSocket` cho readinessProbe của Rollout |
| Không phân biệt được V1/V2 tốt | Hai bản giống hệt nhau khi `FAIL=false` | Dùng V2 lỗi (mã 500) để đếm; đề xuất TV1 thêm `/version` |
| `kubectl` mất kết nối sau khi nghỉ | Minikube dừng | `minikube start`, mở lại port-forward |
| Lệnh `k6` không nhận | PATH chưa cập nhật | Mở lại terminal (hoặc VS Code) |

---

## 4. TV3 - Monitoring and automatic abort (integration validation pending)

This section is NOT proof of a successful automatic abort. The earlier manual Canary abort in section 3 is a separate test.

| Check | Actual UTC time | Observed value / evidence | Result |
|---|---|---|---|
| Prometheus ServiceMonitor / targets UP | Not run | `docs/evidence/`, Prometheus Targets screenshot | Pending |
| Canary traffic rate | Not run | PromQL request rate + traffic generator log | Pending |
| Canary HTTP 5xx rate | Not run | PromQL measured ratio | Pending |
| Canary latency P95 | Not run | PromQL measured seconds | Pending |
| AnalysisRun Failed | Not run | AnalysisRun yaml + screenshot | Pending |
| Rollout Aborted | Not run | Rollout describe + screenshot | Pending |
| Ingress restored to V1 HTTP 200 | Not run | Timestamped 200 responses and Service endpoints | Pending |

Add real screenshots to `docs/images/` and command outputs to `docs/evidence/` after running the [Monitoring instructions](../monitoring/README.md). Do not present the previous manually aborted rollout as an automatic rollback test.
