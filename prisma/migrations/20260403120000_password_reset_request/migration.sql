-- CreateEnum
CREATE TYPE "PasswordResetRequestStatus" AS ENUM ('pending_approval', 'rejected', 'approved_pending_otp', 'otp_verified', 'completed', 'expired');

-- CreateTable
CREATE TABLE "password_reset_request" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" "PasswordResetRequestStatus" NOT NULL DEFAULT 'pending_approval',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "reviewed_by_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "otp_hash" VARCHAR(255),
    "otp_expires_at" TIMESTAMP(3),
    "otp_attempts" INTEGER NOT NULL DEFAULT 0,
    "otp_verified_at" TIMESTAMP(3),

    CONSTRAINT "password_reset_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_reset_request_user_id_status_idx" ON "password_reset_request"("user_id", "status");

-- CreateIndex
CREATE INDEX "password_reset_request_expires_at_idx" ON "password_reset_request"("expires_at");

-- CreateIndex
CREATE INDEX "password_reset_request_status_idx" ON "password_reset_request"("status");

-- AddForeignKey
ALTER TABLE "password_reset_request" ADD CONSTRAINT "password_reset_request_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_request" ADD CONSTRAINT "password_reset_request_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
