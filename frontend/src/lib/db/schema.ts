import {
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const relationshipTypeEnum = pgEnum("relationship_type", [
  "SUPPORTS",
  "CONTRADICTS",
  "EXTENDS",
  "REFERENCES",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const papers = pgTable("papers", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  abstract: text("abstract"),
  doi: text("doi"),
  pubmedId: text("pubmed_id").unique(),
  publicationDate: timestamp("publication_date", { withTimezone: true }),
  journal: text("journal"),
  authors: text("authors").array(),
  fullText: text("full_text"),
  embeddingVector: text("embedding_vector"),
  source: text("source").default("pubmed").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const paperChunks = pgTable("paper_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  paperId: uuid("paper_id")
    .notNull()
    .references(() => papers.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embeddingVector: text("embedding_vector"),
});

export const paperAnalyses = pgTable("paper_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  paperId: uuid("paper_id")
    .notNull()
    .unique()
    .references(() => papers.id, { onDelete: "cascade" }),
  researchQuestion: text("research_question"),
  methodology: text("methodology"),
  sampleSize: text("sample_size"),
  population: text("population"),
  results: text("results"),
  limitations: text("limitations"),
  confidenceScore: doublePrecision("confidence_score"),
  findings: text("findings").array(),
  plainSummary: text("plain_summary"),
  conflictOfInterest: text("conflict_of_interest"),
  funding: text("funding"),
  status: text("status").default("pending").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const evidenceScores = pgTable("evidence_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  paperId: uuid("paper_id")
    .notNull()
    .unique()
    .references(() => papers.id, { onDelete: "cascade" }),
  score: doublePrecision("score").notNull().default(0),
  studyTypeScore: doublePrecision("study_type_score").default(0),
  sampleSizeScore: doublePrecision("sample_size_score").default(0),
  recencyScore: doublePrecision("recency_score").default(0),
  biasScore: doublePrecision("bias_score").default(0),
  reasoning: text("reasoning"),
});

export const researchGraphs = pgTable("research_graphs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourcePaper: uuid("source_paper")
    .notNull()
    .references(() => papers.id, { onDelete: "cascade" }),
  targetPaper: uuid("target_paper")
    .notNull()
    .references(() => papers.id, { onDelete: "cascade" }),
  relationshipType: relationshipTypeEnum("relationship_type").notNull(),
});
