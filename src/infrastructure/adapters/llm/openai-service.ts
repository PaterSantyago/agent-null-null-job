import { Effect } from "effect";
import OpenAI from "openai";

import type { Job, JobScore } from "@/domain/entities/job.js";
import type { LLMService, LLMError } from "@/domain/ports/llm-service.js";
import { JobSchema, JobScoreSchema } from "@/domain/schemas/job-schemas.js";

export const createOpenAIService = (apiKey: string, model = "gpt-4o-mini"): LLMService => {
  const openai = new OpenAI({ apiKey });

  return {
    extractJobData: (rawContent: string): Effect.Effect<Job, LLMError> => {
      return Effect.tryPromise({
        try: async () => {
          const response = await openai.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content: `You are a job data extraction specialist. Extract structured job information from raw LinkedIn job postings.

Return a JSON object with the following structure:
{
  "title": "string",
  "company": "string", 
  "location": "string",
  "remotePolicy": "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN",
  "seniority": "ENTRY" | "MID" | "SENIOR" | "LEAD" | "PRINCIPAL" | "UNKNOWN",
  "employmentType": "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "UNKNOWN",
  "postedAt": "ISO datetime string",
  "salaryHint": "string (optional)",
  "languages": ["string array"],
  "techStack": ["string array"],
  "description": "string",
  "applyUrl": "string",
  "source": "linkedin"
}

Rules:
- Extract only information explicitly mentioned in the content
- Use "UNKNOWN" for fields that cannot be determined
- Extract tech stack from job requirements and descriptions
- Extract programming languages mentioned
- Use current timestamp for postedAt if not specified
- Keep description concise but informative`,
              },
              {
                role: "user",
                content: `Extract job data from this content:\n\n${rawContent}`,
              },
            ],
            temperature: 0.1,
            response_format: { type: "json_object" },
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error("No content in response");
          }

          const parsed = JSON.parse(content);
          const validated = JobSchema.parse(parsed);

          return {
            id: { value: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` },
            title: validated.title,
            company: validated.company,
            location: validated.location,
            remotePolicy: validated.remotePolicy,
            seniority: validated.seniority,
            employmentType: validated.employmentType,
            postedAt: new Date(validated.postedAt),
            salaryHint: validated.salaryHint ?? "",
            languages: validated.languages,
            techStack: validated.techStack,
            description: validated.description,
            applyUrl: validated.applyUrl,
            source: validated.source,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
        catch: (error) =>
          ({
            _tag: "LLMError",
            type: "API_ERROR",
            message: `Failed to extract job data: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as LLMError,
      });
    },

    scoreJob: (job: Job, cvContent: string): Effect.Effect<JobScore, LLMError> => {
      return Effect.tryPromise({
        try: async () => {
          const response = await openai.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content: `You are a job matching specialist. Score how well a job matches a candidate's CV on a scale of 0-100.

Consider these factors:
- Required skills vs candidate skills (40%)
- Experience level match (20%)
- Location/remote preferences (15%)
- Company culture fit (10%)
- Salary expectations (10%)
- Career growth potential (5%)

Return a JSON object with:
{
  "score": number (0-100),
  "rationale": "string explaining the score",
  "gaps": ["array of missing skills/requirements"]
}`,
              },
              {
                role: "user",
                content: `Job: ${job.title} at ${job.company}
Location: ${job.location}
Remote: ${job.remotePolicy}
Seniority: ${job.seniority}
Description: ${job.description}
Tech Stack: ${job.techStack.join(", ")}
Languages: ${job.languages.join(", ")}

CV: ${cvContent}`,
              },
            ],
            temperature: 0.1,
            response_format: { type: "json_object" },
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error("No content in response");
          }

          const parsed = JSON.parse(content);
          const validated = JobScoreSchema.parse(parsed);

          return {
            jobId: job.id.value,
            score: validated.score,
            rationale: validated.rationale,
            gaps: validated.gaps,
            cvVersion: "1.0", // TODO: Make configurable
            scoredAt: new Date(),
          };
        },
        catch: (error) =>
          ({
            _tag: "LLMError",
            type: "API_ERROR",
            message: `Failed to score job: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as LLMError,
      });
    },

    prefilterJob: (job: Job, cvContent: string): Effect.Effect<boolean, LLMError> => {
      return Effect.tryPromise({
        try: async () => {
          const response = await openai.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content: `You are a job prefilter. Quickly determine if a job is worth detailed scoring.

Return "true" if the job is potentially relevant, "false" if it's clearly not a match.

Consider:
- Basic skill overlap
- Location compatibility
- Experience level reasonableness
- Industry relevance`,
              },
              {
                role: "user",
                content: `Job: ${job.title} at ${job.company}
Location: ${job.location}
Description: ${job.description}

CV: ${cvContent}

Should this job be scored? (true/false)`,
              },
            ],
            temperature: 0.1,
            max_tokens: 10,
          });

          const content = response.choices[0]?.message?.content?.trim().toLowerCase();
          return content === "true";
        },
        catch: (error) =>
          ({
            _tag: "LLMError",
            type: "API_ERROR",
            message: `Failed to prefilter job: ${error instanceof Error ? error.message : "Unknown error"}`,
            cause: error instanceof Error ? error : undefined,
          }) as LLMError,
      });
    },
  };
};
