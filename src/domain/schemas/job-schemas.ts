import { z } from "zod";

// ============================================================================
// Job-related Zod Schemas
// ============================================================================

export const RemotePolicySchema = z.enum(["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"]);
export const SenioritySchema = z.enum(["ENTRY", "MID", "SENIOR", "LEAD", "PRINCIPAL", "UNKNOWN"]);
export const EmploymentTypeSchema = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "UNKNOWN",
]);

export const JobIdSchema = z.object({
  value: z.string().min(1),
});

export const JobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().min(1),
  remotePolicy: RemotePolicySchema,
  seniority: SenioritySchema,
  employmentType: EmploymentTypeSchema,
  postedAt: z.string().datetime(),
  salaryHint: z.string().optional(),
  languages: z.array(z.string()),
  techStack: z.array(z.string()),
  description: z.string(),
  applyUrl: z.string().url(),
  source: z.string(),
});

export const JobScoreSchema = z.object({
  score: z.number().min(0).max(100),
  rationale: z.string(),
  gaps: z.array(z.string()),
});

export const AuthSessionSchema = z.object({
  id: z.string().min(1),
  cookies: z.array(z.string()),
  userAgent: z.string(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export const JobRunSchema = z.object({
  id: z.string().min(1),
  criteriaId: z.string().min(1),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  jobsFound: z.number().min(0),
  jobsProcessed: z.number().min(0),
  jobsScored: z.number().min(0),
  errors: z.array(z.string()),
  status: z.enum(["RUNNING", "COMPLETED", "FAILED", "CANCELLED"]),
});

export const JobCriteriaSchema = z.object({
  id: z.string().min(1),
  keywords: z.array(z.string()),
  location: z.string().min(1),
  remotePolicy: RemotePolicySchema.optional(),
  seniority: SenioritySchema.optional(),
  employmentType: EmploymentTypeSchema.optional(),
  salaryMin: z.number().min(0).optional(),
  languages: z.array(z.string()).optional(),
  techStack: z.array(z.string()).optional(),
  enabled: z.boolean(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type JobSchemaType = z.infer<typeof JobSchema>;
export type JobScoreSchemaType = z.infer<typeof JobScoreSchema>;
export type AuthSessionSchemaType = z.infer<typeof AuthSessionSchema>;
export type JobRunSchemaType = z.infer<typeof JobRunSchema>;
export type JobCriteriaSchemaType = z.infer<typeof JobCriteriaSchema>;
