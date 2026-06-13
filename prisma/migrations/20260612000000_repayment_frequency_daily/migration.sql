-- Add daily repayment frequency for loan schedules (business-day installments).
ALTER TYPE "RepaymentFrequency" ADD VALUE IF NOT EXISTS 'daily';

ALTER TABLE "LoanApplication" ALTER COLUMN "repayment_frequency" SET DEFAULT 'daily';
