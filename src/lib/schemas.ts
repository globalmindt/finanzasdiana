import { z } from 'zod';

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const accountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['bank', 'cash', 'wallet']),
  currency: z.literal('EUR'),
  initialBalance: z.number(),
  isActive: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['income', 'expense']),
  fixedOrVariable: z.enum(['fixed', 'variable', 'na']).default('na'),
  color: z.string().default('#888888'),
});

export const transactionSchema = z.object({
  date: z.string().datetime().or(z.date()),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  payeeId: z.string().optional(),
  payeeName: z.string().optional(),
  notes: z.string().optional(),
  reference: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const recurrentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  frequency: z.string(),
  nextRunDate: z.string().datetime().or(z.date()),
  autoPost: z.boolean().default(false),
});

export const investmentSchema = z.object({
  instrument: z.string(),
  platform: z.string(),
  contributionsTotal: z.number().default(0),
  currentValue: z.number().default(0),
  lastUpdate: z.string().datetime().or(z.date()).optional(),
  notes: z.string().optional(),
});

export const payeeSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense', 'both']).default('expense'),
  defaultCategoryId: z.string().optional(),
  defaultAmount: z.number().optional(),
  defaultNotes: z.string().optional(),
  isFixed: z.boolean().default(false),
  frequency: z.string().optional(),
  color: z.string().optional(),
});