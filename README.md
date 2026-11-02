# Đề tài 27: Xây dựng CI/CD với chiến lược Blue-Green và Canary có tự động Rollback

## 1. Giới thiệu đề tài

Đề tài xây dựng pipeline CI/CD cho một ứng dụng mẫu, thử nghiệm hai chiến lược triển khai **Blue-Green** và **Canary**, đồng thời sử dụng các chỉ số dịch vụ để phát hiện vấn đề và hỗ trợ tự động dừng hoặc rollback phiên bản mới.

Khi phát hành phần mềm, phiên bản mới có thể làm tăng tỷ lệ lỗi hoặc độ trễ. Dự án tập trung vào việc kiểm soát lưu lượng, theo dõi tình trạng ứng dụng và kiểm tra khả năng quay lại phiên bản ổn định khi có sự cố.

**Câu hỏi nghiên cứu:** Có thể giảm blast radius của bản phát hành bằng cách kiểm soát lưu lượng và dùng chỉ số dịch vụ để ra quyết định tự động ra sao?

## 2. Mục tiêu

- Tự động hóa kiểm thử, build, quét bảo mật và triển khai từ mã nguồn.
- Tạo Docker image có version để biết image được build từ commit nào.
- Triển khai cùng một ứng dụng theo hai chiến lược Blue-Green và Canary.
- Thử nghiệm Canary theo các bước **5% → 25% → 50% → 100%**.
- Theo dõi tỷ lệ lỗi và độ trễ để đánh giá bản phát hành.
- Tạo phiên bản lỗi có kiểm soát để thử nghiệm dừng rollout và rollback.
- Lưu lại log, biểu đồ và kết quả đo để đưa vào báo cáo.

## 3. Công nghệ dự kiến sử dụng

| Công nghệ                           | Mục đích                                                         |
| ----------------------------------- | ---------------------------------------------------------------- |
| GitHub                              | Lưu mã nguồn và làm việc chung trong nhóm                        |
| GitHub Actions                      | Tự động chạy kiểm thử, build, quét và các bước triển khai        |
| Docker                              | Đóng gói ứng dụng thành image                                    |
| Container Registry (ví dụ GHCR)     | Lưu Docker image có version                                      |
| Kubernetes / Minikube               | Chạy ứng dụng trong môi trường Kubernetes để thực nghiệm         |
| Argo Rollouts                       | Cấu hình và thực hiện Blue-Green, Canary                         |
| NGINX Ingress Controller hoặc Istio | Định tuyến lưu lượng vào ứng dụng; lựa chọn tùy cấu hình thực tế |
| Prometheus                          | Thu thập metric của ứng dụng                                     |
| Grafana                             | Hiển thị biểu đồ metric                                          |
| k6                                  | Tạo tải thử nghiệm                                               |
| Trivy (dự kiến)                     | Quét lỗ hổng bảo mật của Docker image                            |


### 3.1. Thông số kỹ thuật ứng dụng

- **Ngôn ngữ / Framework:** Node.js (Express.js)
- **Cổng ứng dụng (Port):** `3000`
- **Health Check Endpoint:** `GET /health`
- **Prometheus Metrics Endpoint:** `GET /metrics`
- **Cấu hình giả lập lỗi V2:** Biến môi trường `FAIL=true` (Trả về HTTP status `500` để thử nghiệm Auto-Rollback)

### 3.2 Hướng dẫn chạy ứng dụng cục bộ (Local Run)

```bash
# Cài đặt thư viện
npm install

# Chạy ứng dụng bản chuẩn (V1)
npm start

# Chạy ứng dụng giả lập lỗi (V2)
FAIL=true npm start

```
## 4. Phân công công việc

Nhóm gồm 3 thành viên, phân chia công việc theo các nội dung chính của đề tài. Các thành viên phối hợp với nhau trong quá trình tích hợp, kiểm thử và hoàn thiện sản phẩm.

| Thành viên                          | Nhiệm vụ chính                                                                                            | Kết quả dự kiến                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Thành viên 1 – CI/CD                | Xây dựng ứng dụng mẫu, cấu hình pipeline CI/CD, kiểm thử, build Docker image và quét bảo mật.             | Ứng dụng mẫu, Docker image có version và pipeline CI/CD.           |
| Thành viên 2 – Triển khai           | Cấu hình môi trường Kubernetes, triển khai Blue-Green và Canary, thiết lập phân chia lưu lượng.           | Các cấu hình triển khai và kết quả thử nghiệm hai chiến lược.      |
| Thành viên 3 – Giám sát và Rollback | Cấu hình Prometheus, Grafana, thiết lập phân tích metric và kiểm tra khả năng tự động dừng hoặc rollback. | Biểu đồ metric, cấu hình phân tích và kết quả thử nghiệm rollback. |

**Lưu ý:** Các thành viên phối hợp kiểm thử tích hợp, thu thập minh chứng và hoàn thiện báo cáo. Phân công có thể được điều chỉnh trong quá trình thực hiện để phù hợp với tiến độ và tình hình thực tế của nhóm.

## 5. Quy trình hoạt động.

```text
Sửa mã nguồn
    |
    v
Push code lên GitHub
    |
    v
GitHub Actions
    |
    +--> Chạy test
    +--> Build Docker image
    +--> Quét bảo mật image
    +--> Gắn version và lưu image
    |
    v
Triển khai lên Staging
    |
    v
Triển khai sang Production giả lập
    |
    v
Thử nghiệm Blue-Green hoặc Canary
    |
    +--> Prometheus thu thập metric
    +--> AnalysisTemplate đánh giá error rate / latency
    +--> Nếu đạt điều kiện: tiếp tục rollout
    +--> Nếu không đạt: dừng rollout và phục hồi theo cấu hình
    |
    v
Grafana, log và trạng thái deployment dùng làm minh chứng
```

Sơ đồ trên mô tả quy trình dự kiến. Nhóm sẽ kiểm tra từng bước bằng kết quả chạy thực tế.

### Blue-Green

Duy trì phiên bản hiện tại và phiên bản mới ở hai nhóm triển khai. Sau khi kiểm tra phiên bản mới, chuyển lưu lượng sang phiên bản đó. Thực nghiệm sẽ đo thời gian chuyển đổi và kiểm tra khả năng chuyển lại phiên bản cũ.

### Canary

Cho một phần lưu lượng đi đến phiên bản mới, sau đó tăng dần theo các mốc **5% → 25% → 50% → 100%**. Theo dõi metric trong quá trình này để quyết định có tiếp tục phát hành hay không.

Nhóm cần kiểm tra lưu lượng thực tế bằng log hoặc metric; chỉ ghi tỷ lệ trong file cấu hình chưa đủ để chứng minh traffic đã được chia đúng.

### Theo dõi metric và rollback

Các chỉ số chính:

- **Error rate:** tỷ lệ request lỗi, đặc biệt là HTTP 5xx.
- **Latency:** độ trễ phản hồi, có thể theo dõi P95 nếu hệ thống hỗ trợ.

Prometheus cung cấp dữ liệu metric. Argo Rollouts và cấu hình `AnalysisTemplate` sẽ dùng kết quả phân tích để quyết định tiếp tục hay dừng rollout. Nhóm cần kiểm chứng việc phục hồi traffic về phiên bản ổn định trong thực nghiệm.

## 6. Quy trình làm việc.

Mỗi thành viên tạo nhánh riêng và làm việc trên nhánh của mình, kiểm tra mã nguồn trước khi hợp nhất vào `main`. Các thành viên thực hiện lần lượt theo các bước sau.

### Bước 1: Lấy mã nguồn mới nhất

```bash
git switch main
git pull origin main
```

### Bước 2: Tạo nhánh làm việc riêng

Tạo nhánh mới phù hợp với công việc được thực hiện.

```bash
git switch -c feature/ten-cong-viec
```

### Bước 3: Kiểm tra các thay đổi

Sau khi chỉnh sửa code, kiểm tra danh sách tệp đã thay đổi:

```bash
git status
```

### Bước 4: Đưa các thay đổi vào commit

```bash
git add .
```

Sau đó tạo commit:

```bash
git commit -m "feat: mô tả công việc đã thực hiện"
```

### Bước 5: Push code lên nhánh riêng

Lần đầu:

```bash
git push -u origin feature/ten-cong-viec
```

Các lần sau:

```bash
git push
```

### Bước 6: Kiểm tra và merge code vào `main`

Trước khi đẩy lên `main` , cần kiểm tra code đã push lên GitHub, chạy thử chức năng liên quan và bảo đảm không có lỗi ảnh hưởng đến dự án.

Nếu không có lỗi gì, thì chuyển về nhánh `main` và cập nhật mã nguồn:

```bash
git switch main
git pull origin main
```

Sau đó hợp nhất nhánh công việc vào `main`:

```bash
git merge feature/ten-cong-viec
```

Cuối cùng, đẩy nhánh `main` đã cập nhật lên GitHub:

```bash
git push origin main
```

### Lưu ý

- Không thực hiện công việc trực tiếp trên `main`.
- Chỉ hợp nhất code sau khi đã kiểm tra và xác nhận hoạt động phù hợp.
- Nếu `main` có thay đổi mới trong lúc đang làm việc, cần cập nhật và xử lý xung đột trước khi hợp nhất.
- Nếu có xung đột khi hợp nhất, cần xử lý xong và kiểm tra lại trước khi push `main`.

## 7. Kế hoạch thực nghiệm và minh chứng

| Hạng mục                     | Cần làm                                                      | Minh chứng                                                  |
| ---------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| CI/CD                        | Chạy kiểm thử, build image, quét và triển khai theo pipeline | Lịch sử chạy GitHub Actions                                 |
| Truy vết image               | Xác định image được tạo từ commit nào                        | Commit SHA, image tag/digest và trạng thái deployment       |
| Staging / Production giả lập | Kiểm tra quá trình đưa cùng image qua các môi trường         | Log pipeline và thông tin image                             |
| Blue-Green                   | Chuyển traffic và thử quay lại phiên bản cũ                  | Manifest, trạng thái rollout và thời gian chuyển đổi        |
| Canary                       | Thử các mốc 5%, 25%, 50%, 100%                               | Manifest và số liệu traffic thực tế                         |
| Metric                       | Theo dõi error rate và latency                               | Biểu đồ Grafana trước, trong và sau release                 |
| Auto-rollback                | Tạo lỗi có kiểm soát và kiểm tra hệ thống dừng/phục hồi      | AnalysisRun, trạng thái Rollout, log và kết quả request     |
| Load test                    | Tạo tải bằng k6                                              | Script và báo cáo kết quả k6                                |
| So sánh                      | So sánh Blue-Green và Canary                                 | Bảng so sánh tài nguyên, tốc độ, rủi ro và yêu cầu quan sát |

### Tình huống thử nghiệm lỗi

- **V1:** phiên bản hoạt động bình thường.
- **V2:** phiên bản cố ý tăng tỷ lệ HTTP 500 hoặc độ trễ trong môi trường thử nghiệm.
- Dùng k6 tạo tải và theo dõi metric.
- Kiểm tra hệ thống có dừng rollout khi metric vượt ngưỡng đã cấu hình không.
- Kiểm tra traffic có quay về V1 và ứng dụng có hoạt động bình thường trở lại không.
- Ghi lại metric và thời gian phát hiện, dừng rollout, phục hồi.

Ngưỡng metric và kết quả đo sẽ được ghi sau khi nhóm thực nghiệm, không điền số liệu giả định vào báo cáo kết quả.

## 8. Checklist hoàn thành

- [ ] Pipeline chạy được từ commit và có các bước kiểm thử, build, quét, triển khai theo cấu hình.
- [ ] Docker image có version và truy vết được về commit.
- [ ] Có môi trường staging và production giả lập.
- [ ] Blue-Green chuyển đổi được và có đo thời gian chuyển đổi.
- [ ] Canary có các bước 5% → 25% → 50% → 100% và có bằng chứng traffic.
- [ ] Có phiên bản lỗi để thử nghiệm trong môi trường an toàn.
- [ ] Metric được dùng để đánh giá rollout và kích hoạt dừng/rollback theo cấu hình.
- [ ] Có biểu đồ metric trước, trong và sau release.
- [ ] Có bảng so sánh Blue-Green và Canary.
- [ ] Có log, ảnh chụp và kết quả thực nghiệm phục vụ báo cáo.

## 9. Tài liệu tham khảo

Đề tài bám theo đề cương học phần, các tài liệu gợi ý **[30], [55], [56]** và **Bài giảng Chương 5**. Thông tin thư mục chi tiết sẽ được bổ sung khi nhóm đối chiếu với danh mục tài liệu chính thức của môn học.

---
