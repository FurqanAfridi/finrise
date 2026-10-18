-- AlterTable
ALTER TABLE "BuyerInvoice" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "PublisherInvoice" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "BuyerInvoice" ADD CONSTRAINT "BuyerInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherInvoice" ADD CONSTRAINT "PublisherInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
