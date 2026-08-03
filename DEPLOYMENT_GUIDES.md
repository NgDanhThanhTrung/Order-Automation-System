# 🚀 Hướng dẫn Deploy trên Nhiều Nền Tảng

Hướng dẫn chi tiết cách deploy Order Automation System lên các nền tảng hosting khác nhau.

## 📋 Table of Contents

- [🎯 Tổng quan](#-tổng-quan)
- [📦 Prerequisites](#-prerequisites)
- [☁️ PaaS Platforms](️-paas-platforms)
  - [Render.com](#rendercom)
  - [Vercel](#vercel)
  - [Railway](#railway)
  - [Heroku](#heroku)
- [🖥️ VPS Platforms](️-vps-platforms)
  - [DigitalOcean](#digitalocean)
  - [Linode](#linode)
  - [Vultr](#vultr)
- [🐳 Container Deployment](#-container-deployment)
  - [Docker](#docker)
  - [Docker Compose](#docker-compose)
- [🌐 Traditional Hosting](️-traditional-hosting)
  - [cPanel](#cpanel)
  - [Shared Hosting](#shared-hosting)
- [🔧 Post-Deployment](#-post-deployment)

---

## 🎯 Tổng quan

Hệ thống gồm 2 phần chính:
- **Backend API**: Node.js/Express server (port 5000)
- **Frontend**: React/Vite application

Có thể deploy:
- Cả 2 trên cùng platform
- Hoặc tách ra: Backend trên VPS, Frontend trên Vercel

---

## 📦 Prerequisites

### Bắt buộc:
- ✅ Git repository đã push lên GitHub
- ✅ Supabase project đã setup
- ✅ Telegram Bot đã tạo (@BotFather)
- ✅ Cloudinary account
- ✅ SePay account (optional, cho production)

### Tùy chọn theo platform:
- ☁️ PaaS: Tài khoản Render/Vercel/Railway/Heroku
- 🖥️ VPS: Tài khoản DigitalOcean/Linode/Vultr
- 🐳 Docker: Docker & Docker Compose installed

---

## ☁️ PaaS Platforms

### Render.com

**Ưu điểm:**
- 🆓 Free tier cho backend & database
- 🚀 Easy setup, no server management
- 🔄 Auto-deploy từ Git
- 📊 Built-in monitoring

**Nhược điểm:**
- ⏱️ Cold start (30-60s)
- 💰 Free tier có giới hạn resources

#### Backend Deployment

1. **Tạo Web Service**
   - Đi đến [Render Dashboard](https://dashboard.render.com)
   - Click **New → Web Service**
   - Connect GitHub repository
   - Configure:

| Setting | Value |
|---------|-------|
| Name | `order-automation-api` |
| Environment | `Node` |
| Region | `Singapore` (hoặc gần VN nhất) |
| Branch | `main` |
| Build Command | `cd artifacts/api-server && pnpm install && pnpm run build` |
| Start Command | `cd artifacts/api-server && pnpm run start` |
| Health Check Path | `/api/healthz` |

2. **Add Environment Variables**

```env
PORT=5000
NODE_ENV=production
LOG_LEVEL=info

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# SePay
SEPAY_WEBHOOK_TOKEN=your_sepay_token

# Bank Info
BANK_ID=MB
BANK_ACCOUNT_NO=56002005032008
BANK_ACCOUNT_NAME=NGUYEN DANH THANH TRUNG

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_TELEGRAM_CHAT_IDS=your_chat_id

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_FOLDER=payment_reports

# Cron
CRON_AUTO_CANCEL_EXPR=*/20 * * * *
CRON_ENABLED=true
```

3. **Deploy**
   - Click **Deploy Web Service**
   - Chờ 3-5 phút để build & deploy
   - Lưu URL: `https://order-automation-api.onrender.com`

#### Frontend Deployment

1. **Tạo Static Site**
   - Đi đến Render Dashboard
   - Click **New → Static Site**
   - Connect GitHub repository
   - Configure:

| Setting | Value |
|---------|-------|
| Name | `order-automation-frontend` |
| Root Directory | `artifacts/storefront` |
| Build Command | `pnpm install && pnpm run build` |
| Publish Directory | `dist` |

2. **Add Environment Variables**

```env
VITE_PUBLIC_API_URL=https://order-automation-api.onrender.com/api
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
VITE_PUBLIC_BANK_ID=MB
VITE_PUBLIC_BANK_ACCOUNT_NO=56002005032008
VITE_PUBLIC_BANK_ACCOUNT_NAME=NGUYEN DANH THANH TRUNG
```

3. **Deploy**
   - Click **Deploy Static Site**
   - Lưu URL: `https://order-automation-frontend.onrender.com`

---

### Vercel

**Ưu điểm:**
- 🚀 Blazing fast CDN
- 🆓 Generous free tier
- 🔄 Auto-deploy từ Git
- 📊 Analytics

**Nhược điểm:**
- 💰 Không có free tier cho backend (chỉ frontend)
- ⏱️ Cold start cho serverless functions

#### Frontend Deployment (Khuyên dùng)

1. **Tạo Project**
   - Đi đến [Vercel Dashboard](https://vercel.com/dashboard)
   - Click **Add New → Project**
   - Import GitHub repository
   - Configure:

| Setting | Value |
|---------|-------|
| Framework Preset | `Other` (không chọn Vite) |
| Root Directory | `./` (root directory) |
| Build Command | `pnpm run vercel-build` (sử dụng script trong package.json) |
| Output Directory | `artifacts/storefront/dist` |

**⚠️ Lưu ý quan trọng:**
- Đã có file `vercel.json` trong repository để handle pnpm lockfile issues
- Build command sẽ tự động sử dụng `--no-frozen-lockfile` để tránh lỗi lockfile
- Framework để `Other` hoặc `null` để tránh auto-detection issues

2. **Add Environment Variables**

```env
VITE_PUBLIC_API_URL=https://your-backend-url.com/api
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
VITE_PUBLIC_BANK_ID=MB
VITE_PUBLIC_BANK_ACCOUNT_NO=56002005032008
VITE_PUBLIC_BANK_ACCOUNT_NAME=NGUYEN DANH THANH TRUNG
```

3. **Deploy**
   - Click **Deploy**
   - Vercel sẽ tự động assign domain: `https://your-project.vercel.app`

**🔧 Nếu gặp lỗi lockfile:**
- Vercel sẽ tự động sử dụng `--no-frozen-lockfile` nhờ cấu hình trong `vercel.json`
- Nếu vẫn gặp lỗi, vào Project Settings → Build & Development → Override Build Command:
  ```
  cd artifacts/storefront && pnpm install --no-frozen-lockfile && pnpm run build
  ```

---

### Railway

**Ưu điểm:**
- 🆓 Free tier cho small projects
- 🐳 Built-in Docker support
- 🔄 Auto-deploy từ Git
- 📊 Built-in database options

**Nhược điểm:**
- 💰 Free tier giới hạn credits
- ⏱️ Cold start

#### Deployment

1. **Tạo Project**
   - Đi đến [Railway Dashboard](https://railway.app)
   - Click **New Project → Deploy from GitHub repo**
   - Select repository

2. **Configure Services**

**Backend Service:**
- Root directory: `artifacts/api-server`
- Build command: `pnpm install && pnpm run build`
- Start command: `pnpm run start`

**Frontend Service:**
- Root directory: `artifacts/storefront`
- Build command: `pnpm install && pnpm run build`
- Start command: `pnpm run preview` (hoặc serve static)

3. **Add Environment Variables**
   - Railway tự động detect `.env.example`
   - Fill trong các giá trị thực tế

4. **Deploy**
   - Click **Deploy**
   - Railway sẽ assign public URLs

---

### Heroku

**Ưu điểm:**
- 🚀 Mature platform
- 🔄 Easy Git deploy
- 📊 Good monitoring

**Nhược điểm:**
- 💰 No free tier anymore (Eco plan: $5/month)
- ⏱️ Cold start

#### Deployment

1. **Install Heroku CLI**
```bash
npm install -g heroku
```

2. **Login**
```bash
heroku login
```

3. **Create App**
```bash
heroku create order-automation-api
```

4. **Configure Buildpack**
```bash
heroku buildpacks:set heroku/nodejs
```

5. **Add Environment Variables**
```bash
heroku config:set PORT=5000
heroku config:set NODE_ENV=production
heroku config:set SUPABASE_URL=your_url
# ... thêm các biến khác
```

6. **Deploy**
```bash
git push heroku main
```

---

## 🖥️ VPS Platforms

### DigitalOcean

**Ưu điểm:**
- 💰 Rẻ (~$6/month cho Droplet 2GB RAM)
- 🚀 Full control
- 🌍 Singapore data center (gần VN)
- 📊 Good performance

**Nhược điểm:**
- 🔧 Cần quản lý server thủ công
- 🛡️ Cần self-manage security

#### Setup Instructions

1. **Create Droplet**
   - Đi đến [DigitalOcean](https://cloud.digitalocean.com)
   - Click **Create → Droplets**
   - Choose:
     - Image: **Ubuntu 22.04 LTS**
     - Plan: **Basic** ($6/month, 2GB RAM, 1 CPU)
     - Region: **Singapore**
     - Authentication: **SSH Key** (recommended)

2. **Connect to Droplet**
```bash
ssh root@your-droplet-ip
```

3. **Install Dependencies**
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git
```

4. **Clone Repository**
```bash
cd /var/www
git clone https://github.com/NgDanhThanhTrung/Order-Automation-System.git
cd Order-Automation-System
```

5. **Install Dependencies**
```bash
pnpm install
```

6. **Configure Environment**
```bash
cd artifacts/api-server
cp .env.example .env
nano .env
# Fill trong các giá trị thực tế
```

7. **Build Backend**
```bash
pnpm run build
```

8. **Start with PM2**
```bash
pm2 start dist/index.js --name order-api
pm2 save
pm2 startup
```

9. **Configure Nginx**
```bash
nano /etc/nginx/sites-available/order-automation
```

Add this config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /var/www/Order-Automation-System/artifacts/storefront/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/order-automation /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

10. **Setup SSL (Let's Encrypt)**
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

### Linode

**Ưu điểm:**
- 💰 Giá rẻ (~$5/month)
- 🚀 Good performance
- 🌍 Singapore data center

**Nhược điểm:**
- 🔧 Cần quản lý server thủ công

#### Setup Instructions

Tương tự DigitalOcean, nhưng:

1. **Create Linode**
   - Image: **Ubuntu 22.04 LTS**
   - Plan: **Nanode 1GB** ($5/month)
   - Region: **Singapore**

2. **Follow DigitalOcean steps 2-10**
   - Các commands giống hệt

---

### Vultr

**Ưu điểm:**
- 💰 Giá rẻ (~$6/month)
- 🚀 Good performance
- 🌍 Singapore data center

**Nhược điểm:**
- 🔧 Cần quản lý server thủ công

#### Setup Instructions

Tương tự DigitalOcean, nhưng:

1. **Create Instance**
   - OS: **Ubuntu 22.04 LTS**
   - Plan: **Regular Performance** ($6/month)
   - Region: **Singapore**

2. **Follow DigitalOcean steps 2-10**

---

## 🐳 Container Deployment

### Docker

**Ưu điểm:**
- 🐳 Consistent environment
- 🚀 Easy deployment
- 📊 Good for scaling

**Nhược điểm:**
- 💰 Cần hiểu Docker concepts
- 🔧 Cần build & manage images

#### Create Dockerfile

**Backend Dockerfile** (`artifacts/api-server/Dockerfile`):
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN pnpm run build

# Expose port
EXPOSE 5000

# Start
CMD ["pnpm", "run", "start"]
```

**Frontend Dockerfile** (`artifacts/storefront/Dockerfile`):
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN pnpm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### Build & Run

**Backend:**
```bash
cd artifacts/api-server
docker build -t order-automation-api .
docker run -p 5000:5000 --env-file .env order-automation-api
```

**Frontend:**
```bash
cd artifacts/storefront
docker build -t order-automation-frontend .
docker run -p 80:80 order-automation-frontend
```

---

### Docker Compose

**Ưu điểm:**
- 🐳 Easy multi-container orchestration
- 🚀 One command to start all services
- 📊 Good for development & production

#### Create docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./artifacts/api-server
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      # Add other env vars from .env
    env_file:
      - artifacts/api-server/.env
    restart: unless-stopped

  frontend:
    build:
      context: ./artifacts/storefront
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
```

#### Deploy

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 🌐 Traditional Hosting

### cPanel

**Ưu điểm:**
- 🖥️ Easy to use GUI
- 📊 Good for shared hosting
- 💰 Cheap

**Nhược điểm:**
- 🚀 Limited Node.js support
- 🔧 Not ideal for modern apps

#### Setup Instructions

1. **Upload Files**
   - Zip backend: `artifacts/api-server`
   - Upload via cPanel File Manager
   - Extract to `public_html/api`

2. **Install Node.js**
   - Go to **Setup Node.js App** in cPanel
   - Create application:
     - Node.js version: 18
     - Application mode: Production
     - Application root: `/api`
     - Application URL: `yourdomain.com/api`
     - Application startup file: `dist/index.js`

3. **Install Dependencies**
   - Click **Run NPM Install**

4. **Configure Environment**
   - Add environment variables in cPanel
   - Or create `.env` file

5. **Restart Application**

---

### Shared Hosting

**Khuyến nghị:**
- ❌ Không khuyến nghị cho Node.js apps
- ✅ Chỉ dùng cho static frontend

#### Deploy Frontend Only

1. **Build Frontend**
```bash
cd artifacts/storefront
pnpm run build
```

2. **Upload dist folder**
   - Upload contents of `dist/` to `public_html`

3. **Configure API URL**
   - Update `VITE_PUBLIC_API_URL` to point to external backend

---

## 🔧 Post-Deployment

### Configure External Services

#### SePay Webhook
- URL: `https://your-backend-url.com/api/webhook/sepay`
- Token: Same as `SEPAY_WEBHOOK_TOKEN`

#### Telegram Bot
- Ensure bot token is correct
- Test with `/start` command

#### Cloudinary
- Verify credentials
- Test image upload

#### Database
- Verify Supabase connection
- Run health check: `https://your-backend-url.com/api/healthz`

### Monitoring

#### UptimeRobot
- Monitor: `https://your-backend-url.com/api/healthz`
- Interval: 5 minutes
- Alert on downtime

#### Logs
- PaaS: Check platform logs
- VPS: Use PM2 logs: `pm2 logs order-api`
- Docker: `docker-compose logs`

### Backup

#### Database Backup
- Supabase: Auto-backup enabled
- Manual backup via Supabase Dashboard

#### Code Backup
- Git repository (GitHub)
- Regular commits

---

## 📊 Comparison Table

| Platform | Cost | Difficulty | Performance | Scalability |
|----------|------|------------|-------------|-------------|
| Render | Free/$7/mo | Easy | Good | Medium |
| Vercel | Free/$20/mo | Easy | Excellent | High |
| Railway | Free/$5/mo | Easy | Good | Medium |
| Heroku | $5/mo | Easy | Good | High |
| DigitalOcean | $6/mo | Medium | Excellent | High |
| Linode | $5/mo | Medium | Excellent | High |
| Vultr | $6/mo | Medium | Excellent | High |
| Docker | Varies | Hard | Excellent | High |
| cPanel | $3-10/mo | Easy | Poor | Low |

---

## 🎯 Recommendations

### For Beginners:
- **Backend**: Render.com (Free tier)
- **Frontend**: Vercel (Free tier)

### For Production:
- **Backend**: DigitalOcean/Linode ($5-6/mo)
- **Frontend**: Vercel (CDN benefits)

### For Enterprise:
- **Backend**: Kubernetes/Docker
- **Frontend**: Vercel Enterprise

---

## 📞 Support

Nếu gặp vấn đề:
- Check logs: `pm2 logs` hoặc platform logs
- Verify environment variables
- Test health check endpoint
- Review [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

**Happy Deploying! 🚀**