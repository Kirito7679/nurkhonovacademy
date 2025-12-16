-- Add createdBy field to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- Add foreign key constraint
ALTER TABLE "users" ADD CONSTRAINT "users_createdBy_fkey" 
  FOREIGN KEY ("createdBy") REFERENCES "users"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "users_createdBy_idx" ON "users"("createdBy");
