# Hướng dẫn thiết lập môi trường Kubernetes & Argo Rollouts cục bộ

Tài liệu bàn giao Giai đoạn 1 - Thành viên 2 (Kubernetes & Deployment).

## 1. Yêu cầu môi trường
- Hệ điều hành: Windows 11
- Docker Desktop (WSL2 engine)
- Công cụ: Minikube, kubectl, Argo Rollouts kubectl plugin

## 2. Các bước triển khai thực tế

### Bước 1: Khởi động Minikube
Khởi động cluster với Docker driver và cấp phát tài nguyên phù hợp:
```powershell
minikube start --cpus=4 --memory=6144 --driver=docker
### Bước 2: Kích hoạt Ingress Controller
Bật Ingress addon để sẵn sàng cấu hình phân chia lưu lượng:

PowerShell


minikube addons enable ingress
### Bước 3: Cài đặt Argo Rollouts Controller
Tạo namespace và cài đặt controller cùng các CRD vào cụm bằng tùy chọn server-side:

PowerShell


kubectl create namespace argo-rollouts
kubectl apply --server-side -n argo-rollouts -f [https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml](https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml)
Kiểm tra trạng thái pod:

PowerShell


kubectl get pods -n argo-rollouts
### Bước 4: Cài đặt và cấu hình Plugin kubectl-argo-rollouts
Tạo thư mục C:\bin và tải file thực thi chính thức:

PowerShell


New-Item -ItemType Directory -Force -Path "C:\bin"
curl.exe -L -o "C:\bin\kubectl-argo-rollouts.exe" "[https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-windows-amd64](https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-windows-amd64)"
Thêm C:\bin vào biến môi trường PATH:

PowerShell


$env:Path += ";C:\bin"
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "Machine") + ";C:\bin", [EnvironmentVariableTarget]::Machine)
Kiểm tra hoạt động:

PowerShell


kubectl argo rollouts version

---

Sau khi dán và nhấn **Ctrl + S** để lưu file, bạn chạy các lệnh sau trên terminal để đẩy lên nhánh `feature/k8s`[cite: 3]:

```powershell
git add docs/setup-local.md
git commit -m "docs: complete phase 1 local setup documentation"
git push origin feature/k8s