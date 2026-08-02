# 🚀 Deployment Checklist - Order Automation System

## ✅ Pre-Deployment Requirements

### 1. Database Migration
- [ ] Apply migration `00001_init_schema.sql` to Supabase
- [ ] Apply migration `00002_add_stock_management.sql` to Supabase
- [ ] Verify all tables are created: `products`, `orders`, `payment_transactions`, `payment_reports`
- [ ] Verify triggers are working: stock deduction/restoration
- [ ] Test stored procedures: `process_sepay_webhook`, `auto_cancel_expired_orders`

### 2. Environment Configuration
- [ ] Copy `.env.example` to `.env` in both backend and frontend
- [ ] Fill in all required environment variables:
  - Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SEPAY_WEBHOOK_TOKEN`
  - Backend: `TELEGRAM_BOT_TOKEN`, `ADMIN_TELEGRAM_CHAT_IDS`
  - Backend: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - Backend: `BANK_ID`, `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME`
  - Frontend: `VITE_PUBLIC_API_URL`, `VITE_PUBLIC_SUPABASE_URL`, `VITE_PUBLIC_SUPABASE_ANON_KEY`
  - Frontend: `VITE_PUBLIC_BANK_ID`, `VITE_PUBLIC_BANK_ACCOUNT_NO`, `VITE_PUBLIC_BANK_ACCOUNT_NAME`

### 3. External Services Setup
- [ ] **SePay**: Configure webhook URL to `https://your-api-url/api/webhook/sepay`
- [ ] **Telegram Bot**: Create bot via @BotFather, get token and admin chat IDs
- [ ] **Cloudinary**: Create account, get API credentials
- [ ] **UptimeRobot**: Set up health check monitor for `https://your-api-url/api/healthz`

### 4. Dependency Installation
- [ ] Run `pnpm install` in root directory
- [ ] Verify all new dependencies are installed:
  - `express-rate-limit`
  - `swagger-ui-express`
  - `csurf`

## 🔧 Build & Test

### Backend (API Server)
- [ ] Run `cd artifacts/api-server && pnpm run build`
- [ ] Run `cd artifacts/api-server && pnpm run typecheck`
- [ ] Test health check: `curl http://localhost:5000/api/healthz`
- [ ] Test API docs: Open `http://localhost:5000/api/docs`
- [ ] Test CSRF token: `curl http://localhost:5000/api/csrf-token`

### Frontend (Storefront)
- [ ] Run `cd artifacts/storefront && pnpm run build`
- [ ] Run `cd artifacts/storefront && pnpm run typecheck`
- [ ] Test frontend builds successfully

### Integration Testing
- [ ] Test order creation flow end-to-end
- [ ] Test webhook processing (use SePay test or manual trigger)
- [ ] Test stock management (create order → pay → check stock)
- [ ] Test Telegram bot notifications
- [ ] Test admin report endpoints
- [ ] Test rate limiting (try to exceed limits)
- [ ] Test CSRF protection (try without token)
- [ ] Test webhook test endpoint: `curl -X POST http://localhost:5000/api/webhook/test -H "Content-Type: application/json" -d '{...}'`
- [ ] Test webhook info endpoint: `curl http://localhost:5000/api/webhook/test/info`
- [ ] Verify bank account information (MB Bank, 56002005032008) in configuration

## 🚀 Production Deployment

### Backend (Render.com)
- [ ] Push code to Git repository
- [ ] Connect Render.com to repository
- [ ] Configure Web Service:
  - Build Command: `cd artifacts/api-server && pnpm install && pnpm run build`
  - Start Command: `cd artifacts/api-server && pnpm run start`
  - Health Check Path: `/api/healthz`
- [ ] Add all environment variables from `.env.example`
- [ ] Deploy and verify health check passes

### Frontend (Vercel)
- [ ] Connect Vercel to repository
- [ ] Configure Project:
  - Root Directory: `artifacts/storefront`
  - Build Command: `pnpm install && pnpm run build`
  - Output Directory: `dist`
- [ ] Add environment variables with `VITE_PUBLIC_` prefix
- [ ] Deploy and verify frontend loads

### Post-Deployment Verification
- [ ] Test API health check: `curl https://your-api-url/api/healthz`
- [ ] Test API docs: Open `https://your-api-url/api/docs`
- [ ] Test frontend loads and can connect to API
- [ ] Test order creation flow
- [ ] Test webhook receives notifications from SePay
- [ ] Test Telegram bot sends notifications
- [ ] Verify rate limiting is working
- [ ] Verify CSRF protection is working
- [ ] Check logs for any errors

## 🔍 Monitoring & Maintenance

### Health Monitoring
- [ ] UptimeRobot monitoring is active
- [ ] Health check returns 200 OK
- [ ] Database connectivity is stable
- [ ] External services (Cloudinary, Telegram) are reachable

### Log Monitoring
- [ ] Check application logs regularly
- [ ] Monitor webhook retry queue status
- [ ] Track rate limit violations
- [ ] Monitor error rates and types

### Performance
- [ ] Monitor API response times
- [ ] Check database query performance
- [ ] Monitor memory usage
- [ ] Review CDN performance for static assets

## 🐛 Known Issues & Limitations

### Current Limitations
- No user authentication system (uses Telegram admin only)
- No email notifications (Telegram only)
- No real-time order status updates (polling only)
- Manual stock adjustment only via DB function

### Future Improvements
- Add user authentication with Supabase Auth
- Implement email notifications with SendGrid
- Add WebSocket for real-time updates
- Build admin dashboard UI
- Add analytics and reporting features
- Implement multi-currency support
- Add discount/coupon system

## 📞 Support & Troubleshooting

### Common Issues
1. **Webhook not working**: Check SePay token and webhook URL configuration
2. **Telegram bot not responding**: Verify bot token and admin chat IDs
3. **Stock not deducting**: Check if triggers are applied in database
4. **Rate limiting errors**: Adjust limits in rateLimiter middleware
5. **CSRF errors**: Ensure frontend fetches and sends CSRF token

### Debugging
- Check logs: `pino-pretty` for local, Render logs for production
- Use `/api/healthz/detailed` for system diagnostics
- Use `/api/webhook/retry-status` to check failed webhooks
- Use `/api/docs` to test API endpoints interactively
- Use `/api/webhook/test` for development webhook testing (see `WEBHOOK_TEST_GUIDE.md`)
- Use `/api/webhook/test/info` for webhook testing examples and bank account info

### Contact
- For deployment issues: Check Render.com and Vercel documentation
- For database issues: Check Supabase dashboard and logs
- For external service issues: Check respective service dashboards