# Email/Phone Re-Verification Backend Implementation

## Overview

This document describes the implementation of secure email/phone re-verification endpoints with revert functionality in vritti-api-nexus. The implementation follows a 4-step verification flow with rate limiting, OTP verification, and a 72-hour revert window.

## Implementation Date

- **Date**: February 5, 2026
- **Status**: ✅ Complete (Email Flow), 🚧 Pending (Phone Flow)
- **Migration**: Ready (needs to be applied)

## Architecture

### 4-Step Verification Flow

1. **Step 1 - Confirm Identity (25% progress)**
   - Sends OTP to current email/phone
   - Validates user identity before allowing any change
   - Prevents unauthorized email/phone changes

2. **Step 2 - Enter New Value (50% progress)**
   - User enters new email/phone address
   - Validates new value (uniqueness, format)
   - Checks daily rate limit (max 3 requests per day)
   - Creates change request record

3. **Step 3 - Verify New Value (75% progress)**
   - Sends OTP to new email/phone
   - Validates new contact ownership
   - New value remains pending until verified

4. **Step 4 - Success (100% progress)**
   - Updates user's email/phone in database
   - Generates UUID revert token (72h expiry)
   - Sends notification to old email/phone with revert link
   - Returns success response with revert token

## Database Schema

### Three New Tables

#### 1. email_change_requests
```sql
CREATE TABLE "cloud"."email_change_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "cloud"."users"("id") ON DELETE CASCADE,
  "old_email" varchar(255) NOT NULL,
  "new_email" varchar(255),
  "identity_verification_id" uuid REFERENCES "cloud"."email_verifications"("id"),
  "new_email_verification_id" uuid REFERENCES "cloud"."email_verifications"("id"),
  "is_completed" boolean DEFAULT false NOT NULL,
  "revert_token" varchar(255) UNIQUE,
  "revert_expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "reverted_at" timestamp with time zone
);

CREATE INDEX "email_change_requests_user_id_idx" ON "cloud"."email_change_requests" ("user_id");
CREATE INDEX "email_change_requests_revert_token_idx" ON "cloud"."email_change_requests" ("revert_token");
```

#### 2. phone_change_requests
```sql
CREATE TABLE "cloud"."phone_change_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "cloud"."users"("id") ON DELETE CASCADE,
  "old_phone" varchar(20),
  "old_phone_country" varchar(5),
  "new_phone" varchar(20),
  "new_phone_country" varchar(5),
  "identity_verification_id" uuid REFERENCES "cloud"."mobile_verifications"("id"),
  "new_phone_verification_id" uuid REFERENCES "cloud"."mobile_verifications"("id"),
  "is_completed" boolean DEFAULT false NOT NULL,
  "revert_token" varchar(255) UNIQUE,
  "revert_expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "reverted_at" timestamp with time zone
);

CREATE INDEX "phone_change_requests_user_id_idx" ON "cloud"."phone_change_requests" ("user_id");
CREATE INDEX "phone_change_requests_revert_token_idx" ON "cloud"."phone_change_requests" ("revert_token");
```

#### 3. change_request_rate_limits
```sql
CREATE TABLE "cloud"."change_request_rate_limits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "cloud"."users"("id") ON DELETE CASCADE,
  "change_type" varchar(20) NOT NULL, -- 'email' or 'phone'
  "request_count" integer DEFAULT 0 NOT NULL,
  "date" varchar(10) NOT NULL, -- YYYY-MM-DD format
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "change_request_rate_limits_user_type_date_idx"
  ON "cloud"."change_request_rate_limits" ("user_id", "change_type", "date");
```

### Migration File

**Location**: `/Users/shyamsundermittapally/Vritti/api-nexus/src/db/migrations/20260205101708_add_email_phone_change_tables/migration.sql`

**To Apply**:
```bash
cd /Users/shyamsundermittapally/Vritti/api-nexus
pnpm drizzle-kit migrate
```

## File Structure

### Schema Files
- ✅ `/src/db/schema/verification.ts` - Added 3 new tables and type exports

### Repository Files
- ✅ `/src/modules/cloud-api/user/repositories/email-change-request.repository.ts`
- ✅ `/src/modules/cloud-api/user/repositories/phone-change-request.repository.ts`
- ✅ `/src/modules/cloud-api/user/repositories/change-request-rate-limit.repository.ts`

### Service Files
- ✅ `/src/modules/cloud-api/user/services/rate-limit.service.ts`
- ✅ `/src/modules/cloud-api/user/services/email-change.service.ts`
- 🚧 `/src/modules/cloud-api/user/services/phone-change.service.ts` (TODO)

### Controller Files
- ✅ `/src/modules/cloud-api/user/controllers/contact-change.controller.ts`

### DTO Files
- ✅ `/src/modules/cloud-api/user/dto/contact-change.dto.ts`

### Updated Files
- ✅ `/src/modules/cloud-api/user/user.module.ts` - Wired dependencies
- ✅ `/src/modules/cloud-api/user/dto/update-user.dto.ts` - Added email field
- ✅ `/src/modules/cloud-api/onboarding/onboarding.module.ts` - Exported repositories
- ✅ `/src/services/email.service.ts` - Added email change notification templates

## API Endpoints

### Email Change Endpoints (✅ Implemented)

Base path: `/cloud-api/users/contact/email`

1. **POST `/request-identity-verification`**
   - **Description**: Step 1 - Send OTP to current email
   - **Auth**: Required (JWT)
   - **Request Body**: None
   - **Response**:
     ```json
     {
       "verificationId": "uuid",
       "expiresAt": "2026-02-05T16:00:00.000Z"
     }
     ```

2. **POST `/verify-identity`**
   - **Description**: Step 2 - Verify OTP and create change request
   - **Auth**: Required (JWT)
   - **Request Body**:
     ```json
     {
       "verificationId": "uuid",
       "otpCode": "123456"
     }
     ```
   - **Response**:
     ```json
     {
       "changeRequestId": "uuid",
       "changeRequestsToday": 1
     }
     ```

3. **POST `/submit-new-email`**
   - **Description**: Step 3 - Submit new email and send OTP
   - **Auth**: Required (JWT)
   - **Request Body**:
     ```json
     {
       "changeRequestId": "uuid",
       "newEmail": "newemail@example.com"
     }
     ```
   - **Response**:
     ```json
     {
       "verificationId": "uuid",
       "expiresAt": "2026-02-05T16:00:00.000Z"
     }
     ```

4. **POST `/verify-new-email`**
   - **Description**: Step 4 - Verify new email OTP and complete change
   - **Auth**: Required (JWT)
   - **Request Body**:
     ```json
     {
       "changeRequestId": "uuid",
       "verificationId": "uuid",
       "otpCode": "123456"
     }
     ```
   - **Response**:
     ```json
     {
       "success": true,
       "revertToken": "uuid",
       "revertExpiresAt": "2026-02-08T16:00:00.000Z",
       "newEmail": "newemail@example.com"
     }
     ```

5. **POST `/revert`**
   - **Description**: Revert email change using token
   - **Auth**: Required (JWT)
   - **Request Body**:
     ```json
     {
       "revertToken": "uuid"
     }
     ```
   - **Response**:
     ```json
     {
       "success": true,
       "revertedEmail": "oldemail@example.com"
     }
     ```

6. **POST `/resend-otp`**
   - **Description**: Resend OTP to email
   - **Auth**: Required (JWT)
   - **Request Body**:
     ```json
     {
       "verificationId": "uuid"
     }
     ```
   - **Response**:
     ```json
     {
       "success": true,
       "expiresAt": "2026-02-05T16:00:00.000Z"
     }
     ```

### Phone Change Endpoints (🚧 TODO)

Base path: `/cloud-api/users/contact/phone`

Endpoints to implement (same pattern as email):
- POST `/request-identity-verification`
- POST `/verify-identity`
- POST `/submit-new-phone`
- POST `/verify-new-phone`
- POST `/revert`
- POST `/resend-otp`

## Security Features

### Rate Limiting
- **Daily Limit**: Max 3 change requests per day per type (email/phone)
- **Implementation**: Database-tracked with date-based records
- **Reset**: Automatically resets daily based on YYYY-MM-DD date
- **Error**: Returns BadRequestException when limit exceeded

### OTP Security
- **Generation**: 6-digit numeric (100000-999999)
- **Hashing**: Bcrypt with 10 salt rounds
- **Expiry**: 5 minutes from generation
- **Max Attempts**: 3 attempts per OTP
- **Logging**: NEVER logs OTP values (GDPR/PCI compliance)

### Revert Token
- **Generation**: UUID v4 using crypto.randomUUID()
- **Expiry**: 72 hours from change completion
- **Uniqueness**: Database unique constraint
- **Usage**: One-time use, invalidated after revert

### Email Notifications
- **Change Notification**: Sent to old email with revert link
- **Revert Confirmation**: Sent to restored email
- **Fire-and-forget**: Doesn't block response
- **Templates**: Professional HTML with gradient backgrounds
- **Security**: Includes expiry time and security warnings

## Reused Services

The implementation reuses existing services from the onboarding module:

1. **OtpService** (`src/modules/cloud-api/onboarding/services/otp.service.ts`)
   - `generateOtp()` - 6-digit OTP generation
   - `hashOtp(otp)` - Bcrypt hashing
   - `verifyOtp(plainOtp, hashedOtp)` - Bcrypt comparison
   - `getOtpExpiryTime()` - 5-minute expiry calculation
   - `validateOtpAttempt(verification)` - Expiry and max attempts check
   - `isOtpExpired(expiresAt)` - Date comparison
   - `isMaxAttemptsExceeded(attempts)` - Max 3 attempts

2. **EmailService** (`src/services/email.service.ts`)
   - `sendVerificationEmail(email, otp, firstName)` - OTP delivery
   - Professional HTML templates with Brevo API
   - Retry logic with exponential backoff
   - Fire-and-forget pattern

3. **EmailVerificationService** (`src/modules/cloud-api/onboarding/services/email-verification.service.ts`)
   - `sendVerificationOtp(userId, email, firstName)` - Full OTP flow
   - Creates verification record and sends email
   - Handles OTP generation and storage

4. **EmailVerificationRepository** (`src/modules/cloud-api/onboarding/repositories/email-verification.repository.ts`)
   - `create(data)` - Create verification record
   - `findLatestByUserId(userId)` - Get most recent non-verified
   - `incrementAttempts(id)` - SQL-level increment
   - `markAsVerified(id)` - Update isVerified flag
   - `deleteMany(condition)` - Cleanup old verifications

5. **EncryptionService** (`src/services/encryption.service.ts`)
   - `generateOtp()` - Random 6-digit generation
   - `hashOtp(otp)` - Bcrypt hashing
   - `compareOtp(otp, hash)` - Bcrypt comparison

## Error Handling

All errors use `@vritti/api-sdk` exceptions in RFC 7807 format:

### BadRequestException
- `email_not_verified` - Current email not verified
- `verification_not_found` - Invalid verification ID
- `code` - OTP expired or max attempts exceeded
- `change_request_not_found` - Invalid change request ID
- `change_request_completed` - Already completed
- `same_email` - New email same as current
- `email_in_use` - New email already exists
- `new_email_missing` - Missing new email
- `invalid_token` - Invalid revert token
- `token_expired` - Revert token expired
- `already_reverted` - Already reverted
- `already_verified` - Verification already completed
- `rate_limit_exceeded` - Daily limit exceeded (3 per day)

### UnauthorizedException
- `code` - Invalid OTP code

## TypeScript Compilation

✅ **All code compiles successfully**
- No TypeScript errors
- All types properly defined
- Proper null safety handling (`?? undefined`)

## Testing Instructions

### Prerequisites
```bash
# 1. Navigate to api-nexus directory
cd /Users/shyamsundermittapally/Vritti/api-nexus

# 2. Apply database migration
pnpm drizzle-kit migrate

# 3. Start the server
pnpm dev
```

### Manual Testing Flow

1. **Test Email Change Flow**:
   ```bash
   # Step 1: Request identity verification
   curl -X POST http://local.vrittiai.com:3000/cloud-api/users/contact/email/request-identity-verification \
     -H "Authorization: Bearer <JWT_TOKEN>"

   # Step 2: Verify identity (check email for OTP)
   curl -X POST http://local.vrittiai.com:3000/cloud-api/users/contact/email/verify-identity \
     -H "Authorization: Bearer <JWT_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"verificationId": "<UUID>", "otpCode": "123456"}'

   # Step 3: Submit new email
   curl -X POST http://local.vrittiai.com:3000/cloud-api/users/contact/email/submit-new-email \
     -H "Authorization: Bearer <JWT_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"changeRequestId": "<UUID>", "newEmail": "new@example.com"}'

   # Step 4: Verify new email (check new email for OTP)
   curl -X POST http://local.vrittiai.com:3000/cloud-api/users/contact/email/verify-new-email \
     -H "Authorization: Bearer <JWT_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"changeRequestId": "<UUID>", "verificationId": "<UUID>", "otpCode": "123456"}'

   # Revert (check old email for revert link with token)
   curl -X POST http://local.vrittiai.com:3000/cloud-api/users/contact/email/revert \
     -H "Authorization: Bearer <JWT_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"revertToken": "<UUID>"}'
   ```

2. **Test Rate Limiting**:
   - Make 4 change requests in a day
   - 4th request should return `rate_limit_exceeded` error

3. **Test OTP Expiry**:
   - Wait 5 minutes after receiving OTP
   - Try to verify - should return `code` error (OTP expired)

4. **Test Max Attempts**:
   - Enter wrong OTP 3 times
   - 4th attempt should return `code` error (max attempts exceeded)

5. **Test Revert Expiry**:
   - Complete email change
   - Wait 72 hours
   - Try to revert - should return `token_expired` error

## Next Steps

### Phone Change Implementation (TODO)

1. **Create PhoneChangeService** (`/src/modules/cloud-api/user/services/phone-change.service.ts`)
   - Follow same pattern as EmailChangeService
   - Use MobileVerificationService instead of EmailVerificationService
   - Use SMS provider for OTP delivery

2. **Add Phone Endpoints** to ContactChangeController
   - POST `/phone/request-identity-verification`
   - POST `/phone/verify-identity`
   - POST `/phone/submit-new-phone`
   - POST `/phone/verify-new-phone`
   - POST `/phone/revert`
   - POST `/phone/resend-otp`

3. **Add Phone Notification Template**
   - SMS template for change notification
   - Include revert link (via SMS or email fallback)

### Frontend Integration

Once phone endpoints are implemented, the frontend can proceed with:
- Creating verification services (`verification.service.ts`)
- Creating React Query hooks (`useEmailVerification.ts`, `usePhoneVerification.ts`)
- Creating flow hooks (`useEmailChangeFlow.ts`, `usePhoneChangeFlow.ts`)
- Creating dialog components (`EmailVerificationDialog.tsx`, `PhoneVerificationDialog.tsx`)
- Integrating into ProfilePage

## Key Implementation Details

### Database Service Selection
- **Used**: Primary database service (`PrimaryDatabaseService`)
- **Reason**: User module is part of cloud-api, which uses primary database
- **Pattern**: All repositories extend `PrimaryBaseRepository`

### Module Dependencies
- UserModule imports OnboardingModule (forwardRef to avoid circular deps)
- Exports EmailChangeService and repositories for potential reuse
- OnboardingModule exports repositories for UserModule to use

### Logging Best Practices
- **Security**: NEVER log OTP values (GDPR/PCI compliance)
- **Context**: Always include user ID and relevant IDs in logs
- **Actions**: Log key state transitions (verification sent, identity verified, email changed, etc.)
- **Errors**: Log email sending failures but don't block responses

### Email Template Design
- Professional HTML with gradient backgrounds
- Mobile-responsive tables
- Clear call-to-action buttons
- Security warnings and expiry information
- Plain text fallback for email clients without HTML support

## Success Criteria

✅ **Backend Implementation Complete**:
- [x] 3 database tables created
- [x] Migration generated and ready
- [x] 3 repositories implemented
- [x] Rate limit service implemented
- [x] Email change service implemented (6 methods)
- [x] 6 email endpoints implemented
- [x] Email notification templates created
- [x] All DTOs created with validation
- [x] TypeScript compiles without errors
- [x] Module dependencies wired correctly
- [x] Security features implemented (rate limiting, OTP, revert token)

🚧 **Pending**:
- [ ] Phone change service implementation
- [ ] Phone change endpoints implementation
- [ ] Phone notification templates
- [ ] Integration tests
- [ ] E2E tests
- [ ] Frontend implementation

## References

### Plan Document
`/Users/shyamsundermittapally/.claude/plans/enchanted-whistling-planet.md`

### Existing Code Patterns
- OTP Service: `/Users/shyamsundermittapally/Vritti/api-nexus/src/modules/cloud-api/onboarding/services/otp.service.ts`
- Email Verification: `/Users/shyamsundermittapally/Vritti/api-nexus/src/modules/cloud-api/onboarding/services/email-verification.service.ts`
- Email Templates: `/Users/shyamsundermittapally/Vritti/api-nexus/src/services/email.service.ts`
- Repository Pattern: `/Users/shyamsundermittapally/Vritti/api-nexus/src/modules/cloud-api/onboarding/repositories/email-verification.repository.ts`

### Documentation
- Project Best Practices: `/Users/shyamsundermittapally/Vritti/api-nexus/CLAUDE.md`
- Swagger API Docs: `http://local.vrittiai.com:3000/api/docs` (after server starts)
