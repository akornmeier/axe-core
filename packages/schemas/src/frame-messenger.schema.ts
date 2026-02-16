import { z } from 'zod';

// ReplyData
export const ReplyDataSchema = z.object({
  channelId: z.string(),
  message: z.unknown(),
  keepalive: z.boolean()
});
export type ReplyData = z.infer<typeof ReplyDataSchema>;

// TopicData (extends ReplyData with topic)
export const TopicDataSchema = ReplyDataSchema.extend({
  topic: z.string()
});
export type TopicData = z.infer<typeof TopicDataSchema>;
