import { z } from "zod";

export const uploadReceiptMetadataSchema = z.object({
  financialEntryId: z.string().uuid(),
  clientId: z.string().uuid(),
});
