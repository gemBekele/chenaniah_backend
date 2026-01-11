-- AlterTable
ALTER TABLE "notices" ADD COLUMN     "section_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_notices_section" ON "notices"("section_id");

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
