-- CreateTable
CREATE TABLE "admin_data_retention_log" (
    "id" SERIAL NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "performed_by_id" INTEGER NOT NULL,
    "target_user_id" INTEGER,
    "target_client_id" INTEGER,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_data_retention_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_data_retention_log_performed_by_id_idx" ON "admin_data_retention_log"("performed_by_id");

-- CreateIndex
CREATE INDEX "admin_data_retention_log_created_at_idx" ON "admin_data_retention_log"("created_at");

-- AddForeignKey
ALTER TABLE "admin_data_retention_log" ADD CONSTRAINT "admin_data_retention_log_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
