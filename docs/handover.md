# TÀI LI?U BÀN GIAO THÔNG S? ?NG D?NG (HANDOVER - TV1)

## 1. Thông s? K? thu?t
- **Port ?ng d?ng:** 3000
- **Health Check Endpoint:** GET /health (HTTP 200 OK)
- **Metrics Endpoint:** GET /metrics (Ð?nh d?ng Prometheus)

## 2. Các phiên b?n ?ng d?ng (Versions)
- **B?n chu?n (V1):** Ch?y m?c d?nh (
pm start ho?c ch?y Docker Container bình thu?ng).
- **B?n l?i (V2):** Truy?n bi?n môi tru?ng \FAIL=true\ khi ch?y container d? mô ph?ng l?i HTTP 500 (ph?c v? test Auto-Rollback cho TV3).

## 3. Thông tin Docker Image
- **Image Name:** \detai27-app\
- **Container Registry:** Docker Hub
- **Build Context:** \./app\
"@
Set-Content -Path .github\workflows\ci-cd.yml -Value @"
name: Build and Push Docker Image

on:
  push:
    branches: [ "main" ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies & Run Tests
        run: |
          cd app
          npm install
          npm test

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Build Docker Image
        run: |
          docker build -t detai27-app:${{ github.sha }} ./app
          echo "Build thanh cong Docker Image tu ./app voi Tag SHA: ${{ github.sha }}"
