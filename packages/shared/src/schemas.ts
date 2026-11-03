import { z } from 'zod';

export const createInterviewSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100),
  questionId: z.string().min(1, 'Question ID is required'),
  durationSeconds: z.number().int().min(300).max(14400).default(3600),
});

export const executionRequestSchema = z.object({
  kind: z.enum(['RUN', 'SUBMIT']),
  language: z.enum(['python', 'javascript']),
  sourceCode: z.string().max(65536, 'Source code exceeds maximum allowed size (64KB)'),
  stdin: z.string().max(16384, 'Standard input exceeds maximum allowed size (16KB)').optional().default(''),
});

export const interviewNoteSchema = z.object({
  content: z.object({
    approach: z.string().default(''),
    technical: z.string().default(''),
    communication: z.string().default(''),
    strengths: z.string().default(''),
    areasForImprovement: z.string().default(''),
    overall: z.string().default(''),
  }),
});

export const questionQuerySchema = z.object({
  search: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  topic: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type ExecutionRequestInput = z.infer<typeof executionRequestSchema>;
export type InterviewNoteInput = z.infer<typeof interviewNoteSchema>;
export type QuestionQueryInput = z.infer<typeof questionQuerySchema>;

