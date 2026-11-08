const express = require('express');
const client = require('prom-client');

const app = express();
const port = process.env.PORT || 3000;
const isError = process.env.FAIL === 'true';

// Prometheus setup
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// Metrics middleware
app.use((req, res, next) => {
  if (req.path === '/metrics') {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const duration =
      process.hrtime(start)[0] +
      process.hrtime(start)[1] / 1e9;

    const labels = {
      method: req.method,
      route: req.path,
      status: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });

  next();
});

// Template renderer
const getPageHtml = () => {
  const badgeText = isError
    ? 'VERSION 2.0 · UNHEALTHY'
    : 'VERSION 1.0 · HEALTHY';

  const statusClass = isError ? 'unhealthy' : 'healthy';

  return `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>DETAI27 | CI/CD Project</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <style>
      :root {
        --green: #52796f;
        --dark-green: #354f52;
        --navy: #243447;
        --yellow: #e9c46a;
        --cream: #f5f3ed;
        --text: #344054;
        --muted: #75818d;
        --white: #ffffff;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: 'Montserrat', sans-serif;
        color: var(--text);
        background: #fff;
        line-height: 1.7;
      }

      a {
        text-decoration: none;
        color: inherit;
      }

      .topbar {
        min-height: 60px;
        padding: 10px 8%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        background: white;
        border-bottom: 1px solid #edf0ed;
        font-size: 12px;
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 2px 10px rgba(0,0,0,0.03);
      }

      .brand-group {
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .brand {
        color: var(--dark-green);
        font-weight: 800;
        letter-spacing: 1.5px;
        font-size: 17px;
      }

      .topbar-nav {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .nav-btn {
        padding: 6px 14px;
        border-radius: 4px;
        background: var(--cream);
        color: var(--dark-green);
        font-size: 11px;
        font-weight: 700;
        transition: all 0.2s;
        border: 1px solid #e2e8f0;
      }

      .nav-btn:hover {
        background: var(--dark-green);
        color: white;
      }

      .version-badge {
        padding: 6px 13px;
        border-radius: 30px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .5px;
        white-space: nowrap;
      }

      .healthy {
        color: #276749;
        background: #e8f5ed;
      }

      .unhealthy {
        color: #991b1b;
        background: #feecec;
      }

      .hero {
        min-height: 390px;
        padding: 70px 8%;
        display: flex;
        align-items: center;
        color: white;
        background:
          linear-gradient(90deg, rgba(20,35,48,.88), rgba(20,35,48,.35)),
          url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1600&auto=format&fit=crop');
        background-size: cover;
        background-position: center;
      }

      .hero-content {
        max-width: 760px;
      }

      .eyebrow {
        color: var(--yellow);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 3px;
        margin-bottom: 15px;
        text-transform: uppercase;
      }

      .hero h1 {
        font-size: clamp(30px, 5vw, 52px);
        line-height: 1.2;
        font-weight: 800;
        margin-bottom: 18px;
      }

      .hero p {
        max-width: 620px;
        color: #e7edf0;
        font-size: 15px;
        margin-bottom: 27px;
      }

      .hero-btn {
        display: inline-block;
        padding: 12px 24px;
        background: var(--yellow);
        color: var(--navy);
        border-radius: 4px;
        font-size: 12px;
        font-weight: 700;
        transition: .25s;
      }

      .hero-btn:hover {
        background: white;
        transform: translateY(-2px);
      }

      .error-alert {
        padding: 16px 8%;
        background: #fff1f0;
        color: #991b1b;
        border-bottom: 1px solid #fecaca;
        font-size: 13px;
      }

      .section {
        padding: 75px 8%;
      }

      .section-heading {
        text-align: center;
        margin-bottom: 38px;
      }

      .section-subtitle {
        color: var(--green);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 3px;
        text-transform: uppercase;
      }

      .section-title {
        color: var(--navy);
        font-size: clamp(24px, 3vw, 32px);
        font-weight: 800;
        margin-top: 7px;
      }

      .section-line {
        width: 48px;
        height: 3px;
        background: var(--yellow);
        margin: 13px auto 0;
      }

      .about-layout {
        display: grid;
        grid-template-columns: 1fr 1.1fr;
        gap: 55px;
        align-items: center;
        max-width: 1100px;
        margin: auto;
      }

      .about-image {
        min-height: 300px;
        border-radius: 8px;
        background:
          linear-gradient(rgba(36,52,71,.08), rgba(36,52,71,.08)),
          url('https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop');
        background-size: cover;
        background-position: center;
        box-shadow: 18px 18px 0 var(--cream);
      }

      .about-content .section-subtitle {
        margin-bottom: 8px;
      }

      .about-content h2 {
        color: var(--navy);
        font-size: 25px;
        line-height: 1.4;
        margin-bottom: 17px;
      }

      .about-content p {
        color: var(--muted);
        font-size: 13px;
        margin-bottom: 13px;
      }

      .about-highlight {
        margin-top: 18px;
        padding: 15px 18px;
        border-left: 3px solid var(--yellow);
        background: var(--cream);
        color: var(--dark-green);
        font-size: 13px;
        font-weight: 600;
      }

      .project-section {
        background: var(--cream);
      }

      .project-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 22px;
        max-width: 1100px;
        margin: auto;
      }

      .project-card {
        background: white;
        padding: 28px 24px;
        border-radius: 6px;
        box-shadow: 0 5px 20px rgba(30,50,60,.04);
        transition: .25s;
      }

      .project-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(30,50,60,.09);
      }

      .card-number {
        color: var(--yellow);
        font-size: 27px;
        font-weight: 800;
        margin-bottom: 10px;
      }

      .project-card h3 {
        color: var(--navy);
        font-size: 16px;
        margin-bottom: 10px;
      }

      .project-card p {
        color: var(--muted);
        font-size: 12px;
      }

      .tech-list {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px;
        max-width: 900px;
        margin: auto;
      }

      .tech-item {
        padding: 11px 19px;
        border: 1px solid #e3e9e5;
        border-radius: 30px;
        background: white;
        color: var(--dark-green);
        font-size: 12px;
        font-weight: 600;
      }

      .team-section {
        background: #fff;
      }

      .team-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
        max-width: 1050px;
        margin: auto;
      }

      .team-card {
        text-align: center;
        padding: 30px 22px;
        border: 1px solid #edf0ed;
        border-radius: 7px;
        background: white;
        transition: .25s;
      }

      .team-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(30,50,60,.07);
      }

      .member-avatar {
        width: 105px;
        height: 105px;
        margin: 0 auto 18px;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--cream);
        color: var(--green);
        font-size: 35px;
        overflow: hidden;
      }

      .team-card h3 {
        color: var(--navy);
        font-size: 16px;
        margin-bottom: 5px;
      }

      .student-id {
        color: var(--muted);
        font-size: 11px;
        margin-bottom: 13px;
      }

      .member-role {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 30px;
        background: #edf4f0;
        color: var(--dark-green);
        font-size: 10px;
        font-weight: 700;
        margin-bottom: 13px;
      }

      .team-card p {
        color: var(--muted);
        font-size: 12px;
      }

      footer {
        padding: 30px 8%;
        text-align: center;
        background: var(--navy);
        color: #c4ced5;
        font-size: 11px;
      }

      footer strong {
        color: white;
      }

      @media (max-width: 768px) {
        .topbar {
          padding: 12px 5%;
          flex-wrap: wrap;
        }

        .hero {
          min-height: 350px;
          padding: 55px 6%;
        }

        .section {
          padding: 55px 6%;
        }

        .about-layout {
          grid-template-columns: 1fr;
          gap: 35px;
        }

        .about-image {
          min-height: 230px;
        }

        .project-grid,
        .team-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>

  <body>

    <div class="topbar">
      <div class="brand-group">
        <div class="brand">DETAI27</div>
        <span class="version-badge ${statusClass}">
          ${badgeText}
        </span>
      </div>

      <div class="topbar-nav">
        <a href="/" class="nav-btn">Home</a>
        <a href="/health" class="nav-btn">Health</a>
        <a href="/metrics" class="nav-btn">Metrics</a>
      </div>
    </div>

    <header class="hero">
      <div class="hero-content">
        <div class="eyebrow">Cloud Computing Project · 2026</div>

        <h1>
          CI/CD AUTOMATION<br>
          BLUE-GREEN & CANARY
        </h1>

        <p>
          Xây dựng quy trình triển khai phần mềm tự động,
          kiểm soát lưu lượng và phục hồi phiên bản khi
          phát hiện sự cố.
        </p>

        <a href="#about" class="hero-btn">
          KHÁM PHÁ ĐỀ TÀI
        </a>
      </div>
    </header>

    ${isError ? `
      <div class="error-alert">
        <strong>⚠ PHIÊN BẢN ĐANG GIẢ LẬP LỖI:</strong>
        V2 đang được cấu hình để trả về HTTP 500.
        Đây là tình huống thử nghiệm phục vụ việc đánh giá
        khả năng phát hiện lỗi và tự động rollback.
      </div>
    ` : ''}

    <section class="section" id="about">
      <div class="about-layout">

        <div class="about-image"></div>

        <div class="about-content">
          <div class="section-subtitle">ABOUT THE PROJECT</div>

          <h2>
            GIỚI THIỆU<br>
            TỔNG QUAN ĐỀ TÀI
          </h2>

          <p>
            DETAI27 tập trung xây dựng pipeline CI/CD cho
            ứng dụng mẫu, kết hợp hai chiến lược triển khai
            Blue-Green và Canary trên môi trường Kubernetes.
          </p>

          <p>
            Hệ thống sử dụng các chỉ số giám sát như tỷ lệ
            lỗi và độ trễ phản hồi để đánh giá phiên bản mới,
            từ đó hỗ trợ quyết định tiếp tục phát hành hoặc
            dừng rollout khi phát hiện bất thường.
          </p>

          <div class="about-highlight">
            Mục tiêu: Giảm thiểu rủi ro khi phát hành phiên bản
            mới và kiểm soát phạm vi ảnh hưởng khi xảy ra sự cố.
          </div>
        </div>

      </div>
    </section>

    <section class="section project-section">
      <div class="section-heading">
        <div class="section-subtitle">WHAT WE DO</div>
        <h2 class="section-title">NỘI DUNG TRIỂN KHAI</h2>
        <div class="section-line"></div>
      </div>

      <div class="project-grid">

        <div class="project-card">
          <div class="card-number">01</div>
          <h3>CI/CD AUTOMATION</h3>
          <p>
            Tự động hóa quy trình kiểm thử, build Docker image,
            quét bảo mật và chuẩn bị triển khai thông qua
            GitHub Actions.
          </p>
        </div>

        <div class="project-card">
          <div class="card-number">02</div>
          <h3>BLUE-GREEN & CANARY</h3>
          <p>
            Thử nghiệm chuyển đổi giữa hai phiên bản và
            phân chia lưu lượng theo từng giai đoạn nhằm
            kiểm soát quá trình phát hành.
          </p>
        </div>

        <div class="project-card">
          <div class="card-number">03</div>
          <h3>MONITORING & ROLLBACK</h3>
          <p>
            Theo dõi error rate, latency bằng Prometheus
            và Grafana; đánh giá khả năng tự động dừng
            rollout và phục hồi phiên bản ổn định.
          </p>
        </div>

      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <div class="section-subtitle">TECHNOLOGY STACK</div>
        <h2 class="section-title">CÔNG NGHỆ SỬ DỤNG</h2>
        <div class="section-line"></div>
      </div>

      <div class="tech-list">
        <span class="tech-item">Node.js / Express</span>
        <span class="tech-item">GitHub</span>
        <span class="tech-item">GitHub Actions</span>
        <span class="tech-item">Docker</span>
        <span class="tech-item">Kubernetes / Minikube</span>
        <span class="tech-item">Argo Rollouts</span>
        <span class="tech-item">Prometheus</span>
        <span class="tech-item">Grafana</span>
        <span class="tech-item">k6</span>
        <span class="tech-item">Trivy</span>
      </div>
    </section>

    <section class="section team-section">
      <div class="section-heading">
        <div class="section-subtitle">OUR TEAM</div>
        <h2 class="section-title">THÀNH VIÊN NHÓM 27</h2>
        <div class="section-line"></div>
      </div>

      <div class="team-grid">

        <div class="team-card">
          <div class="member-avatar">
            <span>01</span>
          </div>

          <h3>Nguyễn Thị Anh Thư</h3>
          <div class="student-id">MSSV: 095305007534 </div>

          <span class="member-role">CI/CD & APPLICATION</span>

          <p>
            Phụ trách xây dựng ứng dụng mẫu,
            Docker image và pipeline CI/CD.
          </p>
        </div>

        <div class="team-card">
          <div class="member-avatar">
            <span>02</span>
          </div>

          <h3>Phùng Xuân Trung</h3>
          <div class="student-id">MSSV: 075206003583 </div>

          <span class="member-role">KUBERNETES & ROLLOUTS</span>

          <p>
            Phụ trách môi trường Kubernetes,
            triển khai Blue-Green và Canary.
          </p>
        </div>

        <div class="team-card">
          <div class="member-avatar">
            <span>03</span>
          </div>

          <h3>HỌ VÀ TÊN THÀNH VIÊN 3</h3>
          <div class="student-id">MSSV: ................</div>

          <span class="member-role">MONITORING & ROLLBACK</span>

          <p>
            Phụ trách Prometheus, Grafana,
            phân tích metric và kiểm thử rollback.
          </p>
        </div>

      </div>
    </section>

    <footer>
      <strong>DETAI27</strong><br>
      Đồ án môn Điện toán đám mây ·
      Trường Đại học Giao thông vận tải TP.HCM (UTH)<br>
      © 2026 · All Rights Reserved
    </footer>

  </body>
  </html>
  `;
};

// Routes
app.get('/', (req, res) => {
  res.status(isError ? 500 : 200).send(getPageHtml());
});

app.get('/health', (req, res) => {
  if (isError) {
    return res.status(500).send('ERROR');
  }

  res.status(200).send('OK');
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).send('Unable to collect metrics');
  }
});

app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
  console.log(`Version status: ${isError ? 'UNHEALTHY' : 'HEALTHY'}`);
});