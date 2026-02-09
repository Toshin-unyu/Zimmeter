-- CreateEnum
CREATE TYPE "DefaultListType" AS ENUM ('PRIMARY', 'SECONDARY', 'HIDDEN');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "bgColor" TEXT,
ADD COLUMN     "borderColor" TEXT,
ADD COLUMN     "defaultList" "DefaultListType" NOT NULL DEFAULT 'SECONDARY';

-- AlterTable
ALTER TABLE "work_logs" ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "daily_statuses" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "hasLeft" BOOLEAN NOT NULL DEFAULT false,
    "leftAt" TIMESTAMP(3),
    "isFixed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_statuses_userId_date_key" ON "daily_statuses"("userId", "date");

-- AddForeignKey
ALTER TABLE "daily_statuses" ADD CONSTRAINT "daily_statuses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
