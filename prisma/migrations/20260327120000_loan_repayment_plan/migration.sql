-- CreateEnum
CREATE TYPE "RepaymentFrequency" AS ENUM ('weekly', 'monthly');

-- CreateEnum
CREATE TYPE "LoanRepaymentPlanStatus" AS ENUM ('active', 'closed');

-- AlterTable
ALTER TABLE "LoanApplication" ADD COLUMN "repayment_frequency" "RepaymentFrequency" NOT NULL DEFAULT 'monthly';

-- CreateTable
CREATE TABLE "LoanRepaymentPlan" (
    "id" SERIAL NOT NULL,
    "loan_id" INTEGER NOT NULL,
    "repayment_frequency" "RepaymentFrequency" NOT NULL,
    "grace_days_after_due" INTEGER NOT NULL DEFAULT 2,
    "first_due_date" DATE NOT NULL,
    "installment_count" INTEGER NOT NULL,
    "status" "LoanRepaymentPlanStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanRepaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanRepaymentPlan_loan_id_key" ON "LoanRepaymentPlan"("loan_id");

-- AddForeignKey
ALTER TABLE "LoanRepaymentPlan" ADD CONSTRAINT "LoanRepaymentPlan_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
