import type { Language } from "@/lib/types";

export type GuidebookCategory = "basics" | "farm" | "money" | "management" | "system";

export interface GuidebookArticleContent {
  title: string;
  shortExplanation: string;
  whyUseful: string;
  prerequisites: string[];
  steps: string[];
  example?: {
    scenario: string;
    details: string;
    result: string;
  };
  expectedResult: string;
  commonMistakes: string[];
  faqs?: Array<{
    q: string;
    a: string;
  }>;
  troubleshooting?: Array<{
    problem: string;
    solution?: string;
    a?: string;
  }>;
  keywords: string[];
}

export interface GuidebookArticle {
  id: string;
  category: GuidebookCategory;
  categoryLabel: Record<Language, string>;
  icon: string;
  en: GuidebookArticleContent;
  mr: GuidebookArticleContent;
  relatedIds: string[];
}
