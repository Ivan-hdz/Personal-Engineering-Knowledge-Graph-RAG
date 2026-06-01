import { z } from "zod";

export const SourceSchema = z.enum([
  "cursor",
  "github",
  "gitlab",
  "obsidian",
  "jira",
  "chatgpt",
  "copilot",
]);

export const DocumentTypeSchema = z.enum([
  "conversation",
  "decision",
  "pattern",
  "incident",
]);

export const KnowledgeTypeSchema = z.enum(["decision", "pattern", "incident"]);

export const BaseMetadataSchema = z.object({
  source: SourceSchema,
  project: z.string().optional(),
  date: z.string(),
  title: z.string().optional(),
  tags: z.array(z.string()).default([]),
  repository: z.string().optional(),
  branch: z.string().optional(),
  pr: z.number().optional(),
  author: z.string().optional(),
});

export const KnowledgeDocumentSchema = BaseMetadataSchema.extend({
  type: DocumentTypeSchema,
  problem: z.string().optional(),
  solution: z.string().optional(),
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  contentHash: z.string(),
  extracted: z.boolean().default(false),
  confidence: z.number().min(0).max(1).optional(),
  sourceDocumentId: z.string().optional(),
  technologies: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ConversationDocumentSchema = KnowledgeDocumentSchema.extend({
  type: z.literal("conversation"),
  extracted: z.boolean().default(false),
});

export const DecisionDocumentSchema = KnowledgeDocumentSchema.extend({
  type: z.literal("decision"),
});

export const CodePatternDocumentSchema = KnowledgeDocumentSchema.extend({
  type: z.literal("pattern"),
});

export const IncidentDocumentSchema = KnowledgeDocumentSchema.extend({
  type: z.literal("incident"),
});

export const ExtractedKnowledgeSchema = z.object({
  problem: z.string().optional(),
  solution: z.string().optional(),
  title: z.string().optional(),
  technologies: z.array(z.string()).default([]),
  type: KnowledgeTypeSchema,
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string()).default([]),
});

export const SearchFiltersSchema = z.object({
  project: z.string().optional(),
  source: SourceSchema.optional(),
  tags: z.array(z.string()).optional(),
  dateRange: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional(),
  type: DocumentTypeSchema.optional(),
  repository: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

export const IngestInputSchema = z.object({
  content: z.string().min(1),
  metadata: BaseMetadataSchema.extend({
    type: DocumentTypeSchema.default("conversation"),
    problem: z.string().optional(),
    solution: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    technologies: z.array(z.string()).default([]),
    extracted: z.boolean().default(false),
    sourceDocumentId: z.string().optional(),
  }),
});

export type Source = z.infer<typeof SourceSchema>;
export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type KnowledgeType = z.infer<typeof KnowledgeTypeSchema>;
export type BaseMetadata = z.infer<typeof BaseMetadataSchema>;
export type KnowledgeDocument = z.infer<typeof KnowledgeDocumentSchema>;
export type ConversationDocument = z.infer<typeof ConversationDocumentSchema>;
export type DecisionDocument = z.infer<typeof DecisionDocumentSchema>;
export type CodePatternDocument = z.infer<typeof CodePatternDocumentSchema>;
export type IncidentDocument = z.infer<typeof IncidentDocumentSchema>;
export type ExtractedKnowledge = z.infer<typeof ExtractedKnowledgeSchema>;
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export type IngestInput = z.infer<typeof IngestInputSchema>;

export const COLLECTION = "knowledge" as const;

export type CollectionName = typeof COLLECTION;

/** Legacy collection names used before the polymorphic `knowledge` collection. */
export const LEGACY_COLLECTIONS = [
  "conversations",
  "decisions",
  "code_patterns",
  "incidents",
] as const;

export type LegacyCollectionName = (typeof LEGACY_COLLECTIONS)[number];

export interface SearchResult {
  id: string;
  score: number;
  document: KnowledgeDocument;
}
