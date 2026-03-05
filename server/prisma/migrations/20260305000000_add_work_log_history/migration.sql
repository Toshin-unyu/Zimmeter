-- CreateTable
CREATE TABLE "work_log_histories" (
    "id" SERIAL NOT NULL,
    "workLogId" INTEGER NOT NULL,
    "editedById" INTEGER NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_log_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_log_histories_workLogId_idx" ON "work_log_histories"("workLogId");

-- AddForeignKey
ALTER TABLE "work_log_histories" ADD CONSTRAINT "work_log_histories_workLogId_fkey" FOREIGN KEY ("workLogId") REFERENCES "work_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_log_histories" ADD CONSTRAINT "work_log_histories_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
