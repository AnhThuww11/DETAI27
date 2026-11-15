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
### Bước 4: Cài đặt plugin kubectl-argo-rollouts

```powershell
New-Item -ItemType Directory -Force -Path "C:\bin"
curl.exe -L -o "C:\bin\kubectl-argo-rollouts.exe" "https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-windows-amd64"
$env:Path += ";C:\bin"
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\bin", "User")
kubectl argo rollouts version
```

Kết quả mong đợi: `kubectl-argo-rollouts: v1.10.2`.

### Bước 5: Truy cập ứng dụng qua ingress

Bật addon ingress và truy cập bằng port-forward (tránh xung đột cổng 80 trên máy):

```powershell
minikube addons enable ingress
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8081:80
```

Gọi ứng dụng với header `Host` tương ứng:

```powershell
curl.exe -H "Host: canary.local" http://127.0.0.1:8081/
```

### Phiên bản đã dùng

| Thành phần | Phiên bản |
|---|---|
| Minikube | v1.39.0 |
| Kubernetes | v1.37.0 |
| kubectl-argo-rollouts | v1.10.2 |
| NGINX Ingress Controller | v1.15.1 |