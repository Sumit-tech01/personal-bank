"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  Database,
  HelpCircle,
  Info,
  Landmark,
  Lightbulb,
  MapPin,
  Package,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Sprout,
  Tractor,
  Users,
  Users2,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import { GUIDEBOOK_ARTICLES } from "@/lib/guidebook/articles";
import type { GuidebookArticle, GuidebookCategory } from "@/lib/guidebook/types";

const ICON_MAP: Record<string, React.ElementType> = {
  Compass,
  Users,
  Receipt,
  MapPin,
  Sprout,
  ArrowDownLeft: Receipt,
  Users2,
  Tractor,
  Landmark,
  Package,
  BarChart3,
  Bell,
  Database,
  ShieldCheck,
  AlertCircle,
};

export default function GuidebookPage() {
  const { language, t } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  const categories = useMemo(() => {
    return [
      { id: "all", label: t("guidebook.allCategories") },
      { id: "basics", label: t("guidebook.categoryBasics") },
      { id: "farm", label: t("guidebook.categoryFarm") },
      { id: "money", label: t("guidebook.categoryMoney") },
      { id: "management", label: t("guidebook.categoryManagement") },
      { id: "system", label: t("guidebook.categorySystem") },
    ];
  }, [t]);

  // Filter articles by category and search query
  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return GUIDEBOOK_ARTICLES.filter((article) => {
      // Category filter
      if (selectedCategory !== "all" && article.category !== selectedCategory) {
        return false;
      }

      if (!query) return true;

      const content = article[language] || article.en;
      const altContent = language === "mr" ? article.en : article.mr;

      const matchTitle = content.title.toLowerCase().includes(query) || altContent.title.toLowerCase().includes(query);
      const matchDesc = content.shortExplanation.toLowerCase().includes(query) || altContent.shortExplanation.toLowerCase().includes(query);
      const matchKeywords = content.keywords.some((k) => k.toLowerCase().includes(query)) ||
        altContent.keywords.some((k) => k.toLowerCase().includes(query));
      const matchSteps = content.steps.some((s) => s.toLowerCase().includes(query));

      return matchTitle || matchDesc || matchKeywords || matchSteps;
    });
  }, [searchQuery, selectedCategory, language]);

  const activeArticle = useMemo(() => {
    if (!activeArticleId) return null;
    return GUIDEBOOK_ARTICLES.find((a) => a.id === activeArticleId) || null;
  }, [activeArticleId]);

  const relatedArticles = useMemo(() => {
    if (!activeArticle) return [];
    return GUIDEBOOK_ARTICLES.filter((a) => activeArticle.relatedIds.includes(a.id));
  }, [activeArticle]);

  // Render article reader view if an article is selected
  if (activeArticle) {
    const content = activeArticle[language] || activeArticle.en;
    const IconComponent = ICON_MAP[activeArticle.icon] || BookOpen;

    return (
      <div className="min-h-[100dvh] bg-canvas pb-24">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/95 backdrop-blur-md">
          <div className="app-container flex min-h-[60px] items-center justify-between py-2.5">
            <button
              type="button"
              onClick={() => setActiveArticleId(null)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink shadow-sm transition active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("guidebook.backToGuides")}</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-brand-700">
                <Sparkles className="h-3 w-3" />
                {t("guidebook.offlineBadge")}
              </span>
            </div>
          </div>
        </header>

        <main className="app-container max-w-2xl space-y-4 py-4">
          {/* Article Header Card */}
          <article className="overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 shadow-sm">
                <IconComponent className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                    {activeArticle.categoryLabel[language]}
                  </span>
                  <span className="text-[11px] text-ink-muted">·</span>
                  <span className="text-[11px] text-ink-muted">
                    {t("guidebook.readingTime", { minutes: 3 })}
                  </span>
                </div>
                <h1 className="mt-1 text-[20px] font-bold tracking-tight text-ink">
                  {content.title}
                </h1>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
                  {content.shortExplanation}
                </p>
              </div>
            </div>

            {/* Why Useful */}
            <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/50 p-3.5">
              <div className="flex items-start gap-2.5">
                <Lightbulb className="h-4 w-4 shrink-0 text-brand-700 mt-0.5" />
                <div>
                  <h2 className="text-[12px] font-semibold text-brand-900">
                    {language === "mr" ? "हे का महत्त्वाचे आहे?" : "Why is this important?"}
                  </h2>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-brand-800">
                    {content.whyUseful}
                  </p>
                </div>
              </div>
            </div>
          </article>

          {/* Prerequisites */}
          {content.prerequisites && content.prerequisites.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <Info className="h-4 w-4 text-ink-muted" />
                {t("guidebook.prerequisites")}
              </h2>
              <ul className="mt-2.5 space-y-2">
                {content.prerequisites.map((pre, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[13px] text-ink-secondary">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-canvas text-[11px] font-semibold text-ink-muted">
                      ✓
                    </span>
                    <span className="leading-5">{pre}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Numbered Steps */}
          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <CheckCircle2 className="h-4 w-4 text-brand-600" />
              {t("guidebook.steps")}
            </h2>
            <ol className="mt-3.5 space-y-3">
              {content.steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3 text-[13px] leading-relaxed text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-700">
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5 text-ink-secondary leading-normal">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* Instructional Example */}
          {content.example && (
            <section className="rounded-2xl border border-amber/30 bg-amber-light/30 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber/20 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-amber">
                  {language === "mr" ? "प्रात्यक्षिक उदाहरण" : "Instructional Example"}
                </span>
                <span className="text-[12px] font-semibold text-ink">{content.example.scenario}</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
                {content.example.details}
              </p>
              <div className="mt-3 rounded-xl border border-amber/40 bg-white/80 p-3">
                <p className="text-[12px] font-semibold text-ink">
                  {language === "mr" ? "निकालाचे स्वरूप:" : "Calculated Result:"}
                </p>
                <p className="mt-0.5 text-[12.5px] font-medium text-brand-800">
                  {content.example.result}
                </p>
              </div>
            </section>
          )}

          {/* Expected Result */}
          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <h2 className="text-[13px] font-semibold text-ink">
              {t("guidebook.expectedResult")}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
              {content.expectedResult}
            </p>
          </section>

          {/* Common Mistakes */}
          {content.commonMistakes && content.commonMistakes.length > 0 && (
            <section className="rounded-2xl border border-negative/20 bg-negative-light/30 p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-negative">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {t("guidebook.commonMistakes")}
              </h2>
              <ul className="mt-2 space-y-1.5">
                {content.commonMistakes.map((mistake, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-secondary">
                    <span className="text-negative font-bold">✕</span>
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* FAQs */}
          {content.faqs && content.faqs.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <HelpCircle className="h-4 w-4 text-brand-600" />
                {t("guidebook.faqs")}
              </h2>
              <div className="mt-3 space-y-3 divide-y divide-line/60">
                {content.faqs.map((faq, idx) => (
                  <div key={idx} className={idx > 0 ? "pt-3" : ""}>
                    <p className="text-[13px] font-semibold text-ink">{faq.q}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Troubleshooting */}
          {content.troubleshooting && content.troubleshooting.length > 0 && (
            <section className="rounded-2xl border border-amber/30 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-amber-900">
                <AlertCircle className="h-4 w-4 text-amber" />
                {t("guidebook.troubleshooting")}
              </h2>
              <div className="mt-3 space-y-3 divide-y divide-line/60">
                {content.troubleshooting.map((item, idx) => (
                  <div key={idx} className={idx > 0 ? "pt-3" : ""}>
                    <p className="text-[13px] font-semibold text-ink">{item.problem}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
                      {item.solution || item.a}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <h2 className="text-[13.5px] font-semibold text-ink">
                {t("guidebook.related")}
              </h2>
              <div className="mt-3 space-y-2">
                {relatedArticles.map((rel) => {
                  const relContent = rel[language] || rel.en;
                  const RelIcon = ICON_MAP[rel.icon] || BookOpen;

                  return (
                    <button
                      key={rel.id}
                      type="button"
                      onClick={() => {
                        setActiveArticleId(rel.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-line/70 bg-canvas/40 p-3 text-left transition hover:bg-canvas active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                          <RelIcon className="h-4 w-4" />
                        </span>
                        <span className="truncate text-[12.5px] font-medium text-ink">
                          {relContent.title}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  // Guidebook Index / Home View
  return (
    <div className="min-h-[100dvh] bg-canvas pb-28">
      <PageHeader
        title={t("guidebook.title")}
        subtitle={t("guidebook.subtitle")}
        backHref="/more"
      />

      <main className="app-container space-y-4 py-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("guidebook.searchPlaceholder")}
            className="input pl-10 pr-10 text-[13px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-muted hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Categories Horizontal Scroller */}
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 py-0.5 sm:mx-0 sm:px-0">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
                  isSelected
                    ? "bg-brand-600 text-white shadow-sm"
                    : "border border-line bg-white text-ink-secondary hover:bg-canvas"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Offline Badge & Count Banner */}
        <div className="flex items-center justify-between rounded-xl border border-line/70 bg-white/70 px-3.5 py-2 text-[11.5px] text-ink-secondary">
          <span className="font-medium text-ink">
            {language === "mr"
              ? `${filteredArticles.length} मार्गदर्शक उपलब्ध`
              : `${filteredArticles.length} guides available`}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
            <Sparkles className="h-3 w-3" />
            {t("guidebook.offlineBadge")}
          </span>
        </div>

        {/* Articles List */}
        {filteredArticles.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
            <BookOpen className="mx-auto h-10 w-10 text-ink-muted/50" />
            <h2 className="mt-3 text-[14px] font-semibold text-ink">
              {t("guidebook.noResults")}
            </h2>
            <p className="mt-1 text-[12px] text-ink-muted">
              {t("guidebook.tryAnother")}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="btn-secondary mx-auto mt-4 text-[12px]"
            >
              {language === "mr" ? "सर्व मार्गदर्शक दाखवा" : "Show All Guides"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {filteredArticles.map((article) => {
              const content = article[language] || article.en;
              const IconComponent = ICON_MAP[article.icon] || BookOpen;

              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => setActiveArticleId(article.id)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-line bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md active:scale-[0.99]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
                        <IconComponent className="h-5 w-5" />
                      </span>
                      <span className="rounded-full bg-canvas px-2.5 py-0.5 text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                        {article.categoryLabel[language]}
                      </span>
                    </div>
                    <h2 className="mt-3 text-[14.5px] font-semibold leading-snug text-ink transition group-hover:text-brand-700">
                      {content.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-muted">
                      {content.shortExplanation}
                    </p>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between border-t border-line/50 pt-2 text-[11px] font-medium text-brand-700">
                    <span>{language === "mr" ? "वाचा" : "Read Guide"}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
