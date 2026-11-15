# TÀI LIỆU BÀN GIAO ỨNG DỤNG (HANDOVER - TV1)

## 1. Tổng quan

TV1 phụ trách phát triển ứng dụng, kiểm thử, đóng gói Docker và thiết lập CI Pipeline cho đề tài:

**Xây dựng CI/CD với chiến lược Blue-Green và Canary có tự động Rollback.**

Ứng dụng được xây dựng bằng Node.js và Express, hỗ trợ hai phiên bản V1 và V2 để phục vụ thử nghiệm triển khai.

## 2. Thông số kỹ thuật

| Thành phần | Thông tin |
|---|---|
| Ngôn ngữ | JavaScript (Node.js) |
| Framework | Express |
| Port | 3000 |
| Health Check | GET /health |
| Metrics | GET /metrics |
| Trang chủ | GET / |

### Các API

- `GET /`: Hiển thị trang chủ và thông tin phiên bản ứng dụng.
- `GET /health`: Kiểm tra trạng thái hoạt động của ứng dụng.
- `GET /metrics`: Cung cấp metrics theo định dạng Prometheus.

## 3. Các phiên bản ứng dụng

### V1 - Phiên bản hoạt động bình thường

- Image: `jzat11/detai27-app:v1`
- Trạng thái: HEALTHY.
- Health Check trả về HTTP 200 OK.
- Sử dụng làm phiên bản ổn định (Blue).

### V2 - Phiên bản mô phỏng lỗi

- Image: `jzat11/detai27-app:v2`
- Sử dụng biến môi trường `FAIL=true` khi khởi chạy container.
- Khi bật biến này, ứng dụng trả về HTTP 500.
- Sử dụng để kiểm thử Canary, phát hiện lỗi và Automatic Rollback.

**Lưu ý:** Biến `FAIL=true` phải được khai báo trong cấu hình Deployment Kubernetes. Biến này không được thiết lập mặc định bên trong Docker image.

## 4. Thông tin Docker Registry

- Registry: Docker Hub
- Docker Hub Username: `jzat11`
- Repository: `jzat11/detai27-app`

| Phiên bản | Image Tag | Digest |
|---|---|---|
| V1 | `jzat11/detai27-app:v1` | `sha256:9e756aeddb2472b77e770b797aca6dd0c52385803ca7da97108d20ba6b05e8b7` |
| V2 | `jzat11/detai27-app:v2` | `sha256:8c7bde9ab4a5690790dc8156f7be5021725282433ea70237beb6065a915f53ff` |

Build Context: `./app`

## 5. Hướng dẫn sử dụng Docker Image

### 5.1. Pull image

```bash
docker pull jzat11/detai27-app:v1
docker pull jzat11/detai27-app:v2
```

### 5.2. Chạy phiên bản V1

```bash
docker run -d --name detai27-v1 -p 3000:3000 jzat11/detai27-app:v1
```

Kiểm tra:

```bash
curl http://localhost:3000/health
```

Kết quả mong đợi: HTTP 200 OK.

### 5.3. Chạy phiên bản V2

```bash
docker run -d --name detai27-v2 -e FAIL=true -p 3001:3000 jzat11/detai27-app:v2
```

Kiểm tra:

```bash
curl http://localhost:3001/health
```

Kết quả mong đợi: HTTP 500 Internal Server Error.

## 6. Kiểm thử và CI Pipeline

Các hạng mục TV1 đã thực hiện:

- Xây dựng ứng dụng Node.js/Express.
- Xây dựng hai phiên bản V1 và V2.
- Viết Automated Tests bằng Node.js Test Runner.
- Kiểm thử thành công: 8/8 test cases.
- Đóng gói ứng dụng bằng Docker.
- Thiết lập GitHub Actions CI Pipeline.
- Tích hợp Trivy để quét lỗ hổng bảo mật Docker Image.
- Build và kiểm tra Docker Image.
- Push V1 và V2 lên Docker Hub.
- Pull và chạy thử image từ Docker Hub.

## 7. Kết quả kiểm thử Registry

| Hạng mục | Kết quả |
|---|---|
| Push image V1 | PASS |
| Push image V2 | PASS |
| Pull image V1 | PASS |
| Pull image V2 | PASS |
| Chạy container V1 | PASS |
| V1 Health Check | HTTP 200 |
| Chạy container V2 với FAIL=true | PASS |
| V2 Health Check | HTTP 500 |

## 8. Nội dung bàn giao cho TV2 và TV3

### TV2 - Kubernetes & Deployment

- Sử dụng image V1: `jzat11/detai27-app:v1`.
- Sử dụng image V2: `jzat11/detai27-app:v2`.
- Khai báo container port: `3000`.
- Sử dụng `/health` làm Health Check Endpoint.
- Sử dụng `/metrics` làm Metrics Endpoint nếu cần tích hợp monitoring.
- Khai báo `FAIL=true` cho V2 khi cần mô phỏng lỗi.

### TV3 - Monitoring & Automatic Rollback

- Sử dụng `/metrics` để thu thập metrics.
- Sử dụng V2 với `FAIL=true` để tạo tình huống lỗi HTTP 500.
- Theo dõi Error Rate và các chỉ số phục vụ đánh giá chất lượng triển khai.
- Kết hợp AnalysisTemplate và AnalysisRun để kiểm thử cơ chế tự động dừng hoặc rollback.

## 9. Repository

GitHub Repository: https://github.com/AnhThuww11/DETAI27

Docker Hub Repository: https://hub.docker.com/r/jzat11/detai27-app

---

**Phụ trách:** TV1 - CI/CD & Application

**Trạng thái:** Hoàn thành bàn giao Docker Image V1/V2 và kết quả kiểm thử Registry.