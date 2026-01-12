-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "paymentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "paymentId" DROP NOT NULL;
