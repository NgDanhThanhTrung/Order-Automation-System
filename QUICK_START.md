# 🚀 Quick Start Deployment Guide

Hướng dẫn nhanh để deploy Order Automation System lên production trong 15 phút.

## 🎯 3 Cách Deploy Phổ Biến Nhất

### 1️⃣ Cách Nhanh Nhất (Khuyên Dùng Cho Beginner)
**Backend: Render.com + Frontend: Vercel**
- ⏱️ Thời gian: 10-15 phút
- 💰 Chi phí: $0 (free tier)
- 🔧 Độ khó: Dễ

### 2️⃣ Cách Tối Ưu Cho Production
**Backend: DigitalOcean + Frontend: Vercel**
- ⏱️ Thời gian: 20-30 phút
- 💰 Chi phí: ~$6/tháng
- 🔧 Độ khó: Trung bình

### 3️⃣ Cách Containerization
**Docker + Docker Compose**
- ⏱️ Thời gian: 15-20 phút
- 💰 Chi phí: Tùy VPS provider
- 🔧 Độ khó: Trung bình

---

## 📋 Prerequisites (Tất cả các cách)

✅ Tài khoản GitHub với code đã push
✅ Supabase project đã tạo
✅ Telegram Bot token từ @BotFather
✅ Cloudinary account
✅ SePay account (optional, cho production)

---

## 1️⃣ Cách Nhanh Nhất: Render + Vercel

### Bước 1: Deploy Backend lên Render (5 phút)

1. **Đăng ký Render.com**
   - Truy cập [https://render.com](https://render.com)
   - Sign up với GitHub

2. **Tạo Web Service**
   - Click **New → Web Service**
   - Connect GitHub repository: `NgDanhThanhTrung/Order-Automation-System`
   - Configure:

| Setting | Value |
|---------|-------|
| Name | `order-automation-api` |
| Environment | `Node` |
| Region | `Singapore` |
| Branch | `main` |
| Build Command | `cd artifacts/api-server && pnpm install && pnpm run build` |
| Start Command | `cd artifacts/api-server && pnpm run start` |
| Health Check Path | `/api/healthz` |

3. **Add Environment Variables**
   Copy từ `.env.example` và fill trong:

```env
PORT=5000
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SEPAY_WEBHOOK_TOKEN=your_sepay_token
BANK_ID=MB
BANK_ACCOUNT_NO=56002005032008
BANK_ACCOUNT_NAME=NGUYEN DANH THANH TRUNG
TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_TELEGRAM_CHAT_IDS=your_chat_id
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_FOLDER=payment_reports
CRON_AUTO_CANCEL_EXPR=*/20 * * * *
CRON_ENABLED=true
```

4. **Deploy**
   - Click **Deploy Web Service**
   - Chờ 3-5 phút
   - Lưu URL: `https://order-automation-api.onrender.com`

### Bước 2: Deploy Frontend lên Vercel (5 phút)

1. **Đăng ký Vercel**
   - Truy cập [https://vercel.com](https://vercel.com)
   - Sign up với GitHub

2. **Tạo Project**
   - Click **Add New → Project**
   - Import repository: `NgDanhThanhTrung/Order-Automation-System`
   - Configure:

| Setting | Value |
|---------|-------|
| Framework Preset | `Vite` |
| Root Directory | `artifacts/storefront` |
| Build Command | `pnpm install && pnpm run build` |
| Output Directory | `dist` |

3. **Add Environment Variables**

```env
VITE_PUBLIC_API_URL=https://order-automation-api.onrender.com/api
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
VITE_PUBLIC_BANK_ID=MB
VITE_PUBLIC_BANK_ACCOUNT_NO=56002005032008
VITE_PUBLIC_BANK_ACCOUNT_NAME=NGUYEN DANH THANH TRUNG
```

4. **Deploy**
   - Click **Deploy**
   - Chờ 1-2 phút
   - Lưu URL: `https://your-project.vercel.app`

### Bước 3: Configure External Services (5 phút)

**SePay Webhook:**
1. Login vào [SePay Dashboard](https://sepay.vn/dashboard)
2. Đi đến **Cài đặt → Webhook**
3. Webhook URL: `https://order-automation-api.onrender.com/api/webhook/sepay`
4. Secret Token: (giống `SEPAY_WEBHOOK_TOKEN`)
5. Enable và save

**Telegram Bot:**
1. Chat với bot bạn đã tạo
2. Gửi `/start` để test
3. Lấy chat ID từ [@userinfobot](https://t.me/userinfobot)
4. Update `ADMIN_TELEGRAM_CHAT_IDS` trong Render nếu cần

**UptimeRobot:**
1. Đăng ký [UptimeRobot](https://uptimerobot.com)
2. Tạo monitor cho: `https://order-automation-api.onrender.com/api/healthz`
3. Interval: 5 minutes

### ✅ Xong!

Hệ thống của bạn đã live:
- 🌐 Frontend: `https://your-project.vercel.app`
- 🔧 Backend: `https://order-automation-api.onrender.com`
- 📚 API Docs: `https://order-automation-api.onrender.com/api/docs`

---

## 2️⃣ Cách Tối Ưu: DigitalOcean + Vercel

### Bước 1: Setup DigitalOcean Droplet (10 phút)

1. **Create Droplet**
   - Login [DigitalOcean](https://cloud.digitalocean.com)
   - Click **Create → Droplets**
   - Configure:
     - Image: **Ubuntu 22.04 LTS**
     - Plan: **Basic** ($6/month, 2GB RAM)
     - Region: **Singapore**
     - Authentication: **SSH Key** (recommended) hoặc Password

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

# Install PM2
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git
```

4. **Clone & Setup**
```bash
cd /var/www
git clone https://github.com/NgDanhThanhTrung/Order-Automation-System.git
cd Order-Automation-System
pnpm install
```

5. **Configure Environment**
```bash
cd artifacts/api-server
cp .env.example .env
nano .env
# Fill trong các giá trị thực tế
```

6. **Build & Start**
```bash
pnpm run build
pm2 start dist/index.js --name order-api
pm2 save
pm2 startup
```

7. **Configure Nginx**
```bash
nano /etc/nginx/sites-available/order-automation
```

Add:
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
}
```

Enable:
```bash
ln -s /etc/nginx/sites-available/order-automation /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

8. **Setup SSL**
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

### Bước 2: Deploy Frontend lên Vercel (5 phút)

Follow giống cách 1, nhưng API URL là domain của bạn:
```env
VITE_PUBLIC_API_URL=https://your-domain.com/api
```

### Bước 3: Configure External Services (5 phút)

Same as cách 1, nhưng webhook URL là: `https://your-domain.com/api/webhook/sepay`

---

## 3️⃣ Cách Docker: Docker Compose

### Bước 1: Prepare Environment (5 phút)

1. **Clone Repository**
```bash
git clone https://github.com/NgDanhThanhTrung/Order-Automation-System.git
cd Order-Automation-System
```

2. **Configure Environment**
```bash
cd artifacts/api-server
cp .env.example .env
nano .env
# Fill trong các giá trị thực tế
```

### Bước 2: Build & Run (5 phút)

1. **Build Images**
```bash
docker-compose build
```

2. **Start Services**
```bash
docker-compose up -d
```

3. **Check Status**
```bash
docker-compose ps
docker-compose logs -f
```

### Bước 3: Deploy to Cloud (5 phút)

**Option A: Deploy to VPS with Docker**
```bash
# SSH vào VPS
ssh user@your-vps-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose

# Clone repo
git clone https://github.com/NgDanhThanhTrung/Order-Automation-System.git
cd Order-Automation-System

# Configure .env
# ... (như bước 1)

# Deploy
docker-compose up -d
```

**Option B: Deploy to Docker Cloud Services**
- **DigitalOcean App Platform**: Connect GitHub repo, auto-deploy from docker-compose.yml
- **AWS ECS**: Push images to Docker Hub, deploy to ECS
- **Google Cloud Run**: Push images, deploy to Cloud Run

---

## 🔍 Verification Steps

Sau khi deploy xong, verify:

1. **Health Check**
```bash
curl https://your-backend-url.com/api/healthz
```

2. **API Documentation**
Mở: `https://your-backend-url.com/api/docs`

3. **Frontend Load**
Mở: `https://your-frontend-url.com`

4. **Test Webhook**
```bash
curl -X POST https://your-backend-url.com/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123456789,
    "bankBrandName": "MB",
    "accountNumber": "56002005032008",
    "transactionDate": "2026-08-03 10:30:00",
    "amountIn": 500000,
    "amountOut": 0,
    "content": "TEST123",
    "transferType": "in"
  }'
```

5. **Telegram Bot**
Chat với bot, gửi `/start`

---

## 🆘 Troubleshooting

### Build Failed
- Check environment variables
- Verify Supabase credentials
- Check build logs

### Webhook Not Working
- Verify SePay token
- Check webhook URL is correct
- Test with `/api/webhook/test` endpoint

### Frontend Can't Connect to Backend
- Check `VITE_PUBLIC_API_URL`
- Verify CORS settings
- Check backend is running

### Database Connection Failed
- Verify Supabase URL and keys
- Check Supabase project is active
- Test connection with Supabase Dashboard

---

## 📞 Need Help?

- 📖 Xem [DEPLOYMENT_GUIDES.md](DEPLOYMENT_GUIDES.md) cho chi tiết
- 📋 Xem [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) cho checklist
- 🐛 Report issue trên GitHub
- 💬 Contact author

---

**Chúc bạn deploy thành công! 🚀**