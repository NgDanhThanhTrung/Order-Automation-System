# Changelog - Order Automation System

## [Unreleased]

### Added - Security & Reliability (High Priority)
- **Stock Management**: Added database triggers to automatically deduct stock when orders are paid and restore stock when orders are cancelled
- **Rate Limiting**: Implemented comprehensive rate limiting for all API endpoints with different limits for different endpoint types
- **Enhanced Health Check**: Added comprehensive health checks for database, Cloudinary, Telegram bot, and memory usage
- **Input Sanitization**: Added input sanitization middleware to prevent XSS and SQL injection attacks
- **Webhook Retry Queue**: Implemented automatic retry mechanism for failed webhooks with exponential backoff
- **Safe Date Parsing**: Added robust date parsing with validation to prevent invalid dates from defaulting to current time
- **CSRF Protection**: Added CSRF token protection for state-changing operations
- **Request ID Tracking**: Implemented unique request ID tracking for better debugging and tracing

### Added - Developer Experience
- **API Documentation**: Added Swagger UI with OpenAPI 3.0 specification at `/api/docs`
- **CSRF Token Endpoint**: Added `/api/csrf-token` endpoint for frontend to fetch CSRF tokens
- **Webhook Retry Status**: Added `/api/webhook/retry-status` admin endpoint to monitor retry queue
- **Test Webhook Endpoint**: Added `/api/webhook/test` endpoint for development and testing without SePay authentication
- **Test Webhook Info**: Added `/api/webhook/test/info` endpoint with usage examples and bank account information
- **Webhook Test Guide**: Added comprehensive `WEBHOOK_TEST_GUIDE.md` documentation with examples and troubleshooting

### Changed - Configuration
- **Bank Information**: Updated bank account information to MB Bank (account 56002005032008) in environment configuration
- **Environment Variables**: Updated `.env.example` to use `VITE_PUBLIC_` prefix for frontend environment variables (correct for Vite)
- **Dependencies**: Added required packages: `express-rate-limit`, `swagger-ui-express`, `csurf`
- **Package Cleanup**: Removed unused `yamljs` dependency (using JSON instead)
- **Swagger Documentation**: Updated swagger.json with test webhook endpoints and correct bank account examples

### Fixed - Bugs
- **Frontend QR URL**: Fixed inconsistency where frontend was generating QR URL instead of using backend response
- **Date Parsing Vulnerability**: Fixed unsafe date parsing in webhook that could default to current time on invalid input
- **Webhook Error Handling**: Improved error handling with proper retry logic for transient failures

### Changed - Configuration
- **Environment Variables**: Updated `.env.example` to use `VITE_PUBLIC_` prefix for frontend environment variables (correct for Vite)
- **Dependencies**: Added required packages: `express-rate-limit`, `swagger-ui-express`, `csurf`
- **Package Cleanup**: Removed unused `yamljs` dependency (using JSON instead)

### Database Migration
- **Migration 00002**: Added stock management triggers and helper functions

## [1.0.0] - Initial Release
- Basic order management system
- SePay webhook integration
- Telegram bot notifications
- Cloudinary image upload
- Admin reporting dashboard
- VietQR payment integration