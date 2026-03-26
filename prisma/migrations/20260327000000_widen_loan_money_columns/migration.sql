-- Widen loan-related money columns from DECIMAL(10,2) to DECIMAL(18,2)
-- to avoid numeric overflow (PostgreSQL 22003) for values >= 10^8.

ALTER TABLE "LoanProduct"
  ALTER COLUMN "min_amount" TYPE DECIMAL(18, 2),
  ALTER COLUMN "max_amount" TYPE DECIMAL(18, 2);

ALTER TABLE "LoanApplication"
  ALTER COLUMN "requested_amount" TYPE DECIMAL(18, 2),
  ALTER COLUMN "approved_amount" TYPE DECIMAL(18, 2);

ALTER TABLE "Loan"
  ALTER COLUMN "principal_amount" TYPE DECIMAL(18, 2),
  ALTER COLUMN "monthly_payment" TYPE DECIMAL(18, 2),
  ALTER COLUMN "total_repayment_amount" TYPE DECIMAL(18, 2),
  ALTER COLUMN "current_balance" TYPE DECIMAL(18, 2),
  ALTER COLUMN "total_paid" TYPE DECIMAL(18, 2);

ALTER TABLE "LoanPayment"
  ALTER COLUMN "principal_amount" TYPE DECIMAL(18, 2),
  ALTER COLUMN "interest_amount" TYPE DECIMAL(18, 2),
  ALTER COLUMN "total_due" TYPE DECIMAL(18, 2),
  ALTER COLUMN "amount_paid" TYPE DECIMAL(18, 2),
  ALTER COLUMN "penalty_amount" TYPE DECIMAL(18, 2);

ALTER TABLE "LoanDeductionNotification"
  ALTER COLUMN "amount" TYPE DECIMAL(18, 2);
