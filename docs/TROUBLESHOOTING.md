# 🔧 Troubleshooting Guide

Hướng dẫn giải quyết các vấn đề thường gặp khi deploy Order Automation System.

## 🚨 Common Build Issues

### ❌ "ERR_PNPM_OUTDATED_LOCKFILE" Error

**Problem:**
```
ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date
```

**Cause:**
- Dependencies được thêm vào `package.json` nhưng lockfile không được cập nhật
- CI environments (Vercel, Render) sử dụng `frozen-lockfile` mặc định

**Solution:**

#### Vercel:
1. Đã có `vercel-build` script trong root package.json:
```json
"vercel-build": "pnpm install --no-frozen-lockfile && cd artifacts/storefront && pnpm run build"
```

2. Đã loại bỏ `vercel.json` để tránh monorepo workspace complexity

3. Nếu vẫn gặp lỗi, override build command trong Project Settings:
```
pnpm install --no-frozen-lockfile && cd artifacts/storefront && pnpm run build
```

#### Render:
1. Đã có `render-build` script trong package.json:
```json
"render-build": "pnpm install --no-frozen-lockfile && pnpm run build"
```

2. Sử dụng build command: `pnpm run render-build`

3. Nếu vẫn gặp lỗi, override build command:
```
cd artifacts/api-server && pnpm install --no-frozen-lockfile && pnpm run build
```

#### Local Development:
```bash
pnpm install --no-frozen-lockfile
```

---

### ❌ "Cannot find module" Error

**Problem:**
```
Error: Cannot find module '@types/swagger-ui-express'
```

**Cause:**
- Dependencies không được install đúng
- Lockfile không đồng bộ với package.json

**Solution:**
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Hoặc với --no-frozen-lockfile
pnpm install --no-frozen-lockfile
```

---

### ❌ "No such file or directory" Error (Monorepo)

**Problem:**
```
sh: line 1: cd: artifacts/storefront: No such file or directory
```

**Cause:**
- Vercel không understand monorepo structure
- Workspace filtering không work đúng
- Build command cố gắng cd vào directory không tồn tại trong context

**Solution:**

1. Đã fix bằng cách sử dụng script đơn giản trong package.json:
```json
"vercel-build": "pnpm install --no-frozen-lockfile && cd artifacts/storefront && pnpm run build"
```

2. Đã loại bỏ `vercel.json` để tránh workspace complexity

3. Nếu vẫn gặp lỗi, vào Project Settings → Build & Development:
```
Root Directory: ./
Build Command: pnpm install --no-frozen-lockfile && cd artifacts/storefront && pnpm run build
Output Directory: artifacts/storefront/dist
```

4. Alternative: Deploy frontend separately trong own repository

---

### ❌ "TypeScript compilation error"

**Problem:**
```
error TS2307: Cannot find module 'express-rate-limit'
```

**Cause:**
- Type definitions không được install
- Dependencies thiếu

**Solution:**
```bash
# Reinstall dependencies
pnpm install

# Kiểm tra type definitions
pnpm add -D @types/express-rate-limit
```

---

## 🔌 Connection Issues

### ❌ Database Connection Failed

**Problem:**
```
Error: Failed to connect to Supabase
```

**Cause:**
- Supabase URL hoặc key sai
- Supabase project bị suspend
- Network issues

**Solution:**
1. Verify environment variables:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. Test connection với Supabase Dashboard:
- Mở SQL Editor
- Chạy query test: `SELECT NOW();`

3. Check project status:
- Đi đến Supabase Dashboard
- Verify project is active

---

### ❌ Webhook Not Working

**Problem:**
- SePay webhook không nhận được
- Transaction không được process

**Cause:**
- Webhook URL sai
- SePay token không match
- Server không response đúng

**Solution:**

1. Verify webhook URL:
```
https://your-backend.com/api/webhook/sepay
```

2. Test với test webhook endpoint:
```bash
curl -X POST https://your-backend.com/api/webhook/test \
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

3. Check SePay configuration:
- Login vào SePay Dashboard
- Verify webhook URL
- Verify secret token matches `SEPAY_WEBHOOK_TOKEN`

---

### ❌ Telegram Bot Not Responding

**Problem:**
- Bot không response khi chat
- Không nhận được notifications

**Cause:**
- Bot token sai
- Chat ID sai
- Bot bị banned

**Solution:**

1. Test bot token:
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

2. Get correct chat ID:
- Chat với [@userinfobot](https://t.me/userinfobot)
- Hoặc [@getidsbot](https://t.me/getidsbot)

3. Test bot:
- Chat với bot
- Gửi `/start`
- Gửi `/help`

---

## 🌐 Frontend Issues

### ❌ Frontend Can't Connect to Backend

**Problem:**
- Frontend load nhưng không thể gọi API
- CORS errors trong console

**Cause:**
- `VITE_PUBLIC_API_URL` sai
- CORS không configured
- Backend không running

**Solution:**

1. Verify environment variable:
```env
VITE_PUBLIC_API_URL=https://your-backend.com/api
```

2. Check backend health:
```bash
curl https://your-backend.com/api/healthz
```

3. Check CORS configuration trong backend:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));
```

---

### ❌ QR Code Not Displaying

**Problem:**
- QR code không hiển thị
- Image broken

**Cause:**
- VietQR API không available
- Bank info sai
- Network issues

**Solution:**

1. Test VietQR API:
```bash
curl "https://img.vietqr.io/image/MB/56002005032008/500000.png"
```

2. Verify bank info:
```env
VITE_PUBLIC_BANK_ID=MB
VITE_PUBLIC_BANK_ACCOUNT_NO=56002005032008
VITE_PUBLIC_BANK_ACCOUNT_NAME=NGUYEN DANH THANH TRUNG
```

3. Check browser console cho errors

---

## 🐳 Docker Issues

### ❌ Docker Build Failed

**Problem:**
```
ERROR: failed to solve: executor failed running
```

**Cause:**
- Dockerfile syntax error
- Dependencies không được install
- Cache issues

**Solution:**

1. Clean Docker cache:
```bash
docker system prune -a
```

2. Rebuild without cache:
```bash
docker-compose build --no-cache
```

3. Check Dockerfile syntax:
- Verify base image
- Check COPY commands
- Verify WORKDIR exists

---

### ❌ Container Won't Start

**Problem:**
```
Container exited with code 1
```

**Cause:**
- Start command sai
- Environment variables missing
- Port conflicts

**Solution:**

1. Check container logs:
```bash
docker-compose logs backend
```

2. Verify environment variables:
```bash
docker-compose config
```

3. Check port conflicts:
```bash
netstat -tulpn | grep :5000
```

---

## 📊 Platform-Specific Issues

### Vercel

#### Build Timeout
**Problem:** Build takes too long và timeout

**Solution:**
- Optimize build process
- Increase timeout trong Project Settings
- Use edge functions cho dynamic content

#### Environment Variables Not Loading
**Problem:** Environment variables không available trong build

**Solution:**
- Verify variable names có prefix `VITE_PUBLIC_`
- Re-deploy sau khi add environment variables
- Check `.env.example` cho reference

#### Monorepo Build Issues
**Problem:** Build fails due to monorepo structure
```
Error: Cannot find module or workspace dependencies
```

**Solution:**
- Use simple build script instead of workspace filtering
- Set Root Directory to `./` instead of subdirectory
- Use `vercel-build` script with manual cd command
- Consider separating frontend into own repository for simpler deployment

### Render

#### Cold Start Issues
**Problem:** Server takes long time to respond sau khi idle

**Solution:**
- Upgrade từ free tier
- Use cron job để keep-alive
- Consider alternative platforms cho production

#### Database Connection Issues
**Problem:** Cannot connect to external database

**Solution:**
- Check Render's network access
- Verify database allows external connections
- Use Render's internal database nếu có thể

### DigitalOcean

#### SSH Connection Failed
**Problem:** Cannot SSH vào Droplet

**Solution:**
- Verify SSH key được added
- Check Droplet IP
- Use root password nếu SSH key không work

#### Nginx Configuration Error
**Problem:** Nginx won't start

**Solution:**
```bash
# Test configuration
nginx -t

# Check error logs
tail -f /var/log/nginx/error.log

# Restart nginx
systemctl restart nginx
```

---

## 🔍 Debugging Tips

### Enable Debug Logging

**Backend:**
```env
LOG_LEVEL=debug
```

**Frontend:**
```javascript
console.log('Debug info:', data);
```

### Check Logs

**Vercel:**
- Vercel Dashboard → Deployments → View Logs

**Render:**
- Render Dashboard → Logs

**DigitalOcean:**
```bash
# PM2 logs
pm2 logs order-api

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

**Docker:**
```bash
docker-compose logs -f
```

### Health Check

Test health endpoint:
```bash
curl https://your-backend.com/api/healthz
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-08-03T10:30:00.000Z",
  "services": {
    "database": { "status": "ok" },
    "cloudinary": { "status": "ok" },
    "telegram": { "status": "ok" }
  }
}
```

---

## 📞 Getting Help

Nếu không thể giải quyết vấn đề:

1. **Check Documentation:**
   - [QUICK_START.md](../QUICK_START.md)
   - [DEPLOYMENT_GUIDES.md](../DEPLOYMENT_GUIDES.md)
   - [WEBHOOK_TEST_GUIDE.md](../WEBHOOK_TEST_GUIDE.md)

2. **Search Issues:**
   - GitHub Issues: [Existing issues](https://github.com/NgDanhThanhTrung/Order-Automation-System/issues)

3. **Create New Issue:**
   - Use [Bug Report Template](../.github/ISSUE_TEMPLATE/bug_report.md)
   - Include error logs
   - Describe steps to reproduce
   - Specify platform and environment

4. **Contact Author:**
   - Email: trung@example.com
   - GitHub: [@NgDanhThanhTrung](https://github.com/NgDanhThanhTrung)

---

**Last Updated:** 2026-08-03