import { z } from 'zod/v4';
export const deleteSchema = z.object({
	id: z.number('No message found')
});
