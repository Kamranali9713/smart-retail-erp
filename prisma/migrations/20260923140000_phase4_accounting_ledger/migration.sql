-- Phase 4: accounting journal grouping and ledger indexes
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "entryNo" TEXT NOT NULL,
    "description" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JournalEntry_entryNo_key" ON "JournalEntry"("entryNo");
CREATE INDEX "JournalEntry_createdAt_idx" ON "JournalEntry"("createdAt");
CREATE INDEX "JournalEntry_refType_refId_idx" ON "JournalEntry"("refType", "refId");

ALTER TABLE "Transaction" ADD COLUMN "journalEntryId" TEXT;
CREATE INDEX "Transaction_accountId_createdAt_idx" ON "Transaction"("accountId", "createdAt");
CREATE INDEX "Transaction_refType_refId_idx" ON "Transaction"("refType", "refId");
CREATE INDEX "Transaction_journalEntryId_idx" ON "Transaction"("journalEntryId");

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_journalEntryId_fkey"
FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
