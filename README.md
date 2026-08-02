# 🛒 Order Automation System

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-orange)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue)
![React](https://img.shields.io/badge/react-18+-61DAFB)

## 📋 Overview

Hệ thống Order Automation System là một giải pháp tự động hóa quy trình đơn hàng và thanh toán với tích hợp SePay webhook, Telegram bot notifications, và quản lý tồn kho thông minh. Hệ thống hỗ trợ thanh toán qua mã QR và tự động xử lý đơn hàng khi nhận được thông báo chuyển khoản.

## ✨ Features

### 🎯 Core Features
- **🔄 Automatic Payment Processing**: Tự động xử lý thanh toán qua SePay webhook
- **📱 Telegram Bot Notifications**: Thông báo real-time về đơn hàng mới qua Telegram
- **📦 Stock Management**: Quản lý tồn kho tự động (trừ khi thanh toán, hoàn trả khi hủy)
- **🏦 QR Code Payment**: Tích hợp VietQR để thanh toán qua mã QR
- **📊 Admin Dashboard**: Báo cáo và thống kê đơn hàng, thanh toán
- **🖼️ Cloudinary Integration**: Upload và quản lý hình ảnh thanh toán

### 🔒 Security & Reliability
- **🛡️ CSRF Protection**: Bảo vệ chống tấn công CSRF
- **🧹 Input Sanitization**: Làm sạch dữ liệu đầu vào để prevent XSS/SQL injection
- **🚦 Rate Limiting**: Giới hạn request để prevent abuse
- **🔄 Webhook Retry Queue**: Tự động retry cho webhooks thất bại
- **🔍 Request ID Tracking**: Tracking request để debug dễ dàng hơn
- **🏥 Health Monitoring**: Health check comprehensive cho database và external services

### 🛠️ Developer Experience
- **📚 OpenAPI/Swagger Documentation**: API documentation tại `/api/docs`
- **🧪 Test Webhook Endpoint**: Development testing without SePay authentication
- **📝 TypeScript**: Full-stack TypeScript cho type safety
- **🎨 Modern UI**: React + Tailwind CSS với shadcn/ui components
- **🗄️ Supabase Database**: PostgreSQL database với real-time capabilities

## 🏗️ Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Frontend      │      │   Backend API   │      │   Supabase DB   │
│   (React +      │◄────►│   (Express +     │◄────►│   (PostgreSQL)  │
│   Vite)         │      │   TypeScript)   │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  External APIs  │
                        │  - SePay        │
                        │  - Telegram     │
                        │  - Cloudinary   │
                        └─────────────────┘
```

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: React Hooks
- **HTTP Client**: Custom fetch with CSRF protection

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: Supabase (PostgreSQL)
- **ORM**: Supabase Client
- **Logging**: Pino + pino-pretty

### Integrations
- **Payment**: SePay Webhook + VietQR
- **Notifications**: Telegram Bot API
- **Image Storage**: Cloudinary
- **API Documentation**: Swagger UI

### Development Tools
- **Package Manager**: pnpm
- **Code Quality**: ESLint, Prettier
- **Type Checking**: TypeScript Compiler
- **Git Hooks**: Husky (optional)

## 📦 Installation

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Supabase account
- Telegram Bot (from @BotFather)
- Cloudinary account
- SePay account (optional for testing)

### Setup Steps

1. **Clone repository**
```bash
git clone https://github.com/NgDanhThanhTrung/Order-Automation-System.git
cd Order-Automation-System
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env` in both backend and frontend:
```bash
cp .env.example artifacts/api-server/.env
cp artifacts/storefront/.env.example artifacts/storefront/.env
```

Fill in the required environment variables:
```env
# Backend (artifacts/api-server/.env)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SEPAY_WEBHOOK_TOKEN=your_sepay_token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
ADMIN_TELEGRAM_CHAT_IDS=your_admin_chat_ids
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
BANK_ID=MB
BANK_ACCOUNT_NO=56002005032008
BANK_ACCOUNT_NAME=NGUYEN DANH THANH TRUNG

# Frontend (artifacts/storefront/.env)
VITE_PUBLIC_API_URL=http://localhost:5000/api
VITE_PUBLIC_SUPABASE_URL=your_supabase_url
VITE_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PUBLIC_BANK_ID=MB
VITE_PUBLIC_BANK_ACCOUNT_NO=56002005032008
VITE_PUBLIC_BANK_ACCOUNT_NAME=NGUYEN DANH THANH TRUNG
```

4. **Setup database**
```bash
# Apply migrations to Supabase
# Run the SQL files in supabase/migrations/ in order:
# 1. 00001_init_schema.sql
# 2. 00002_add_stock_management.sql
```

5. **Start development servers**

Backend:
```bash
cd artifacts/api-server
pnpm run dev
```

Frontend:
```bash
cd artifacts/storefront
pnpm run dev
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- API Documentation: http://localhost:5000/api/docs
- Health Check: http://localhost:5000/api/healthz

## 📖 Usage

### Creating an Order

1. Navigate to the frontend application
2. Select a product and enter quantity
3. Fill in customer information
4. Generate QR code for payment
5. Customer scans QR and transfers money
6. System automatically processes payment via SePay webhook
7. Order status updates to "paid"
8. Telegram notification sent to admin

### Testing Without SePay

Use the test webhook endpoint for development:
```bash
curl -X POST http://localhost:5000/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123456789,
    "bankBrandName": "MB",
    "accountNumber": "56002005032008",
    "transactionDate": "2026-08-02 10:30:00",
    "amountIn": 500000,
    "amountOut": 0,
    "content": "ORDLKZM4A8X2",
    "transferType": "in"
  }'
```

See [WEBHOOK_TEST_GUIDE.md](WEBHOOK_TEST_GUIDE.md) for detailed testing scenarios.

### Admin Dashboard

Access admin reports via Telegram bot commands or API endpoints:
- View payment reports
- Monitor order status
- Track webhook retry queue
- Check system health

## 📚 Documentation

- [📖 Webhook Test Guide](WEBHOOK_TEST_GUIDE.md) - Comprehensive webhook testing guide
- [🚀 Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Production deployment steps
- [📝 Changelog](CHANGELOG.md) - Version history and changes
- [🏦 Bank Info Update](BANK_INFO_UPDATE.md) - Bank account configuration
- [📋 API Documentation](http://localhost:5000/api/docs) - Interactive API docs (Swagger)

## 🔐 Security Features

- **CSRF Protection**: All state-changing operations require CSRF tokens
- **Input Sanitization**: All user inputs are sanitized to prevent XSS/SQL injection
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse
- **Webhook Authentication**: SePay webhooks require API key authentication
- **Environment Variables**: Sensitive data stored in environment variables
- **Type Safety**: Full TypeScript coverage prevents type-related vulnerabilities

## 🧪 Testing

### Health Check
```bash
curl http://localhost:5000/api/healthz
```

### API Documentation
Visit http://localhost:5000/api/docs for interactive API testing.

### Test Webhook
```bash
curl http://localhost:5000/api/webhook/test/info
```

## 🚀 Deployment

### Backend (Render.com)
```bash
# Build Command
cd artifacts/api-server && pnpm install && pnpm run build

# Start Command
cd artifacts/api-server && pnpm run start
```

### Frontend (Vercel)
```bash
# Build Command
pnpm install && pnpm run build

# Output Directory
dist
```

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for detailed deployment instructions.

## 📊 Project Statistics

- **Total Files**: 114+
- **Lines of Code**: 12,000+
- **Languages**: TypeScript, JavaScript, SQL, CSS
- **API Endpoints**: 15+
- **Database Tables**: 4
- **External Integrations**: 3 (SePay, Telegram, Cloudinary)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**Nguyễn Danh Thành Trung**

- GitHub: [@NgDanhThanhTrung](https://github.com/NgDanhThanhTrung)
- Email: trung@example.com

## 🙏 Acknowledgments

- [SePay](https://sepay.vn/) - Payment notification service
- [Supabase](https://supabase.com/) - Backend-as-a-Service
- [Telegram](https://telegram.org/) - Messaging platform
- [Cloudinary](https://cloudinary.com/) - Cloud image storage
- [VietQR](https://vietqr.org/) - QR code payment solution

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Check the [documentation](#-documentation)
- Review the [troubleshooting guide](WEBHOOK_TEST_GUIDE.md#-troubleshooting)

## 🔗 Links

- **Repository**: https://github.com/NgDanhThanhTrung/Order-Automation-System
- **API Docs**: http://localhost:5000/api/docs
- **Live Demo**: [Coming Soon]

---

**⭐ Star this repository if you find it helpful!**

Made with ❤️ by Nguyễn Danh Thành Trung