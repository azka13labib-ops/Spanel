"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BookOpen,
  Layers,
  Sparkles,
  Search,
  Menu,
  X,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  Database,
  ShieldAlert,
  Code,
  Bot,
  Rocket,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import {
  DOCS_CATEGORIES,
  DocCategory,
  DocSection,
} from "@/components/docs/DocsData";
import { DocsChatDrawer } from "@/components/docs/DocsChatDrawer";

// Map category icon name to Lucide icon component
const CategoryIcon: React.FC<{ iconName: string; className?: string }> = ({
  iconName,
  className = "w-4 h-4",
}) => {
  switch (iconName) {
    case "Rocket":
      return <Rocket className={className} />;
    case "Layers":
      return <Layers className={className} />;
    case "KeyRound":
      return <KeyRound className={className} />;
    case "Database":
      return <Database className={className} />;
    case "Bot":
      return <Bot className={className} />;
    case "ShieldAlert":
      return <ShieldAlert className={className} />;
    case "Code":
      return <Code className={className} />;
    default:
      return <BookOpen className={className} />;
  }
};

// Markdown-like block renderer for code, tables, headings, and callouts
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Split into paragraphs / code blocks
  const parts = useMemo(() => {
    const rawLines = content.trim().split("\n");
    const blocks: Array<{
      type: "p" | "h3" | "h4" | "code" | "table" | "quote" | "list";
      lang?: string;
      text: string;
      lines?: string[];
    }> = [];

    let inCode = false;
    let codeLang = "";
    let codeLines: string[] = [];

    let inTable = false;
    let tableLines: string[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      if (line.startsWith("```")) {
        if (!inCode) {
          inCode = true;
          codeLang = line.replace("```", "").trim();
          codeLines = [];
        } else {
          inCode = false;
          blocks.push({
            type: "code",
            lang: codeLang || "text",
            text: codeLines.join("\n"),
          });
          codeLines = [];
          codeLang = "";
        }
        continue;
      }

      if (inCode) {
        codeLines.push(line);
        continue;
      }

      // Check for table
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        if (!inTable) {
          inTable = true;
          tableLines = [line];
        } else {
          tableLines.push(line);
        }
        continue;
      } else if (inTable) {
        inTable = false;
        blocks.push({
          type: "table",
          text: "",
          lines: tableLines,
        });
        tableLines = [];
      }

      // Check blockquote
      if (line.startsWith("> ")) {
        blocks.push({
          type: "quote",
          text: line.substring(2).trim(),
        });
        continue;
      }

      // Check headings
      if (line.startsWith("### ")) {
        blocks.push({
          type: "h3",
          text: line.substring(4).trim(),
        });
        continue;
      }

      if (line.startsWith("#### ")) {
        blocks.push({
          type: "h4",
          text: line.substring(5).trim(),
        });
        continue;
      }

      // Check list
      if (line.trim().startsWith("- ") || line.trim().match(/^\d+\.\s/)) {
        blocks.push({
          type: "list",
          text: line.trim(),
        });
        continue;
      }

      // Regular line / paragraph
      if (line.trim().length > 0) {
        blocks.push({
          type: "p",
          text: line.trim(),
        });
      }
    }

    if (inTable && tableLines.length > 0) {
      blocks.push({
        type: "table",
        text: "",
        lines: tableLines,
      });
    }

    return blocks;
  }, [content]);

  let codeBlockCounter = 0;

  return (
    <div className="space-y-4 text-gray-700 leading-relaxed text-sm">
      {parts.map((block, idx) => {
        if (block.type === "h3") {
          return (
            <h3
              key={idx}
              className="text-xl font-bold text-gray-900 mt-6 pt-2 pb-1 border-b border-gray-100 flex items-center gap-2"
            >
              <span className="w-1.5 h-5 rounded-full bg-indigo-600 inline-block" />
              {block.text}
            </h3>
          );
        }

        if (block.type === "h4") {
          return (
            <h4
              key={idx}
              className="text-base font-semibold text-gray-900 mt-4 flex items-center gap-1.5"
            >
              {block.text}
            </h4>
          );
        }

        if (block.type === "code") {
          const currentCodeIdx = codeBlockCounter++;
          const isCopied = copiedCodeIndex === currentCodeIdx;
          return (
            <div
              key={idx}
              className="my-3 rounded-xl overflow-hidden border border-gray-800 bg-gray-950 text-gray-100 shadow-sm"
            >
              <div className="px-4 py-2 bg-gray-900/80 border-b border-gray-800 flex items-center justify-between text-xs text-gray-400 font-mono">
                <span className="uppercase text-[11px] font-semibold tracking-wider text-indigo-400">
                  {block.lang || "code"}
                </span>
                <button
                  onClick={() => handleCopyCode(block.text, currentCodeIdx)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-gray-800 hover:text-white transition text-[11px] cursor-pointer"
                  title="Salin kode"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed text-gray-200">
                <code>{block.text}</code>
              </pre>
            </div>
          );
        }

        if (block.type === "table" && block.lines) {
          const rows = block.lines
            .map((r) =>
              r
                .split("|")
                .map((cell) => cell.trim())
                .filter((cell, i, arr) => i > 0 && i < arr.length - 1)
            )
            .filter((row) => row.length > 0 && !row[0].startsWith("---") && !row[0].startsWith(":---"));

          if (rows.length === 0) return null;
          const header = rows[0];
          const bodyRows = rows.slice(1);

          return (
            <div
              key={idx}
              className="my-4 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-xs"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-800 font-semibold">
                    {header.map((col, cIdx) => (
                      <th key={cIdx} className="px-3.5 py-2.5">
                        {col.replace(/\*\*/g, "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bodyRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-indigo-50/30 transition-colors"
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3.5 py-2.5 text-gray-700 whitespace-nowrap"
                        >
                          {cell.replace(/`/g, "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === "quote") {
          return (
            <div
              key={idx}
              className="my-3 p-3.5 rounded-lg bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>{block.text}</div>
            </div>
          );
        }

        if (block.type === "list") {
          return (
            <div
              key={idx}
              className="flex items-start gap-2 text-xs text-gray-700 pl-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
              <span>{block.text.replace(/^[-\d\.]+\s+/, "")}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-xs text-gray-600 leading-relaxed">
            {block.text}
          </p>
        );
      })}
    </div>
  );
};

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // AI Chat Drawer states
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState<string>("");

  // Shortcut key: Ctrl + K or Slash to search
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter sections across categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return DOCS_CATEGORIES;

    const q = searchQuery.toLowerCase();
    return DOCS_CATEGORIES.map((cat) => {
      const matchedSections = cat.sections.filter(
        (sec) =>
          sec.title.toLowerCase().includes(q) ||
          sec.summary.toLowerCase().includes(q) ||
          sec.tags.some((t) => t.toLowerCase().includes(q)) ||
          sec.content.toLowerCase().includes(q)
      );
      return {
        ...cat,
        sections: matchedSections,
      };
    }).filter((cat) => cat.sections.length > 0);
  }, [searchQuery]);

  // Find active section
  const currentSection: DocSection | undefined = useMemo(() => {
    for (const cat of DOCS_CATEGORIES) {
      const sec = cat.sections.find((s) => s.id === activeSectionId);
      if (sec) return sec;
    }
    return DOCS_CATEGORIES[0]?.sections[0];
  }, [activeSectionId]);

  const currentCategory: DocCategory | undefined = useMemo(() => {
    return DOCS_CATEGORIES.find((cat) => cat.id === currentSection?.category);
  }, [currentSection]);

  // Flatten all sections for Next / Prev navigation
  const allSections = useMemo(() => {
    const list: DocSection[] = [];
    DOCS_CATEGORIES.forEach((cat) => {
      cat.sections.forEach((sec) => list.push(sec));
    });
    return list;
  }, []);

  const currentIndex = allSections.findIndex((s) => s.id === currentSection?.id);
  const prevSection = currentIndex > 0 ? allSections[currentIndex - 1] : null;
  const nextSection =
    currentIndex >= 0 && currentIndex < allSections.length - 1
      ? allSections[currentIndex + 1]
      : null;

  const handleSelectSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenAiWithQuestion = (question: string) => {
    setInitialQuestion(question);
    setChatDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Mobile trigger & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Layers className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-gray-900">
                    sPanel
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    Docs
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hidden sm:inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    v1.1.0
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 -mt-0.5 hidden sm:block">
                  PaaS & DevOps Documentation
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Search Box */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari dokumentasi atau topik... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-12 py-1.5 rounded-lg border border-gray-200 bg-gray-50/80 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-gray-100 border border-gray-200">
                Ctrl K
              </kbd>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5">
            {/* Ask AI Button */}
            <button
              onClick={() => handleOpenAiWithQuestion("")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-linear-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600 shadow-sm shadow-indigo-600/20 active:scale-95 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Tanya AI Docs</span>
            </button>

            {/* Back to Dashboard */}
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-gray-100/80 hover:bg-gray-200/80 hover:text-gray-900 border border-gray-200/60 transition cursor-pointer"
            >
              <span>Dashboard</span>
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </Link>
          </div>
        </div>

        {/* Mobile Search input */}
        <div className="p-3 border-t border-gray-100 md:hidden bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari dokumentasi atau topik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex py-6 gap-8">
        {/* Left Navigation Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 p-4 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:w-64 lg:p-0 lg:border-0 lg:bg-transparent ${
            mobileMenuOpen ? "translate-x-0 top-16" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="sticky top-24 space-y-6 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 pb-10">
            {filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200">
                <HelpCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p>Tidak ditemukan topik dengan kata kunci &quot;{searchQuery}&quot;</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-indigo-600 hover:underline font-semibold"
                >
                  Reset Pencarian
                </button>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div key={category.id} className="space-y-1.5">
                  <div className="flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <CategoryIcon
                      iconName={category.iconName}
                      className="w-3.5 h-3.5 text-indigo-500"
                    />
                    <span>{category.name}</span>
                  </div>

                  <div className="space-y-0.5">
                    {category.sections.map((section) => {
                      const isActive = section.id === currentSection?.id;
                      return (
                        <button
                          key={section.id}
                          onClick={() => handleSelectSection(section.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between group cursor-pointer ${
                            isActive
                              ? "bg-indigo-600 text-white font-semibold shadow-xs"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                          }`}
                        >
                          <span className="truncate pr-2">{section.title}</span>
                          {section.badge && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                                isActive
                                  ? "bg-indigo-700/80 text-white"
                                  : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                              }`}
                            >
                              {section.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Center / Reading Area */}
        <main className="flex-1 min-w-0 max-w-4xl bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          {currentSection ? (
            <article className="space-y-6">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>Dokumentasi</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-700 font-medium">
                  {currentCategory?.name || "Panduan"}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-indigo-600 font-semibold truncate">
                  {currentSection.title}
                </span>
              </nav>

              {/* Title & Badge Header */}
              <div className="border-b border-gray-100 pb-5 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    {currentSection.title}
                  </h1>
                  {currentSection.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {currentSection.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {currentSection.summary}
                </p>

                {/* Tags */}
                {currentSection.tags && currentSection.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    {currentSection.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-gray-100 text-gray-600 border border-gray-200/60"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Markdown Content */}
              <div className="py-2">
                <MarkdownContent content={currentSection.content} />
              </div>

              {/* Ask AI Contextual Help Box */}
              <div className="mt-8 p-5 rounded-xl bg-linear-to-br from-indigo-50/70 via-white to-violet-50/50 border border-indigo-100/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">
                        Punya pertanyaan seputar {currentSection.title}?
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        AI Docs Assistant dapat menjawab langsung dengan kode dan panduan langkah demi langkah.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleOpenAiWithQuestion(
                        `Tolong jelaskan lebih detail tentang ${currentSection.title} dan contoh praktisnya di sPanel.`
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer shadow-xs shrink-0"
                  >
                    Tanya AI Sekarang
                  </button>
                </div>

                {/* Suggested Questions Pills */}
                <div className="pt-2 border-t border-indigo-100/60 flex flex-wrap gap-2">
                  <span className="text-[10px] font-semibold text-indigo-700 self-center">
                    Pertanyaan Terkait:
                  </span>
                  <button
                    onClick={() =>
                      handleOpenAiWithQuestion(
                        `Bagaimana cara implementasi terbaik untuk: ${currentSection.title}?`
                      )
                    }
                    className="px-2.5 py-1 rounded-md text-[11px] bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-50 transition cursor-pointer"
                  >
                    💡 Contoh implementasi terbaik?
                  </button>
                  <button
                    onClick={() =>
                      handleOpenAiWithQuestion(
                        `Apa saja error umum atau hal yang sering salah saat mengonfigurasi ${currentSection.title}?`
                      )
                    }
                    className="px-2.5 py-1 rounded-md text-[11px] bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-50 transition cursor-pointer"
                  >
                    ⚠️ Troubleshooting & Error umum?
                  </button>
                </div>
              </div>

              {/* Prev / Next Article Navigation */}
              <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
                {prevSection ? (
                  <button
                    onClick={() =>
                      handleSelectSection(prevSection.id)
                    }
                    className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20 text-left transition group cursor-pointer max-w-[48%]"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 shrink-0" />
                    <div className="truncate">
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">
                        Sebelumnya
                      </div>
                      <div className="text-xs font-bold text-gray-800 group-hover:text-indigo-700 truncate">
                        {prevSection.title}
                      </div>
                    </div>
                  </button>
                ) : (
                  <div />
                )}

                {nextSection && (
                  <button
                    onClick={() =>
                      handleSelectSection(nextSection.id)
                    }
                    className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20 text-right transition group cursor-pointer max-w-[48%] ml-auto"
                  >
                    <div className="truncate">
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">
                        Selanjutnya
                      </div>
                      <div className="text-xs font-bold text-gray-800 group-hover:text-indigo-700 truncate">
                        {nextSection.title}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 shrink-0" />
                  </button>
                )}
              </div>
            </article>
          ) : (
            <div className="text-center py-20 text-gray-500">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">Pilih topik dokumentasi dari menu di sebelah kiri.</p>
            </div>
          )}
        </main>
      </div>

      {/* Floating Ask AI Button (Bottom Right) */}
      <button
        onClick={() => handleOpenAiWithQuestion("")}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-3 rounded-full bg-linear-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95 transition cursor-pointer group"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
        </span>
        <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
        <span>Tanya AI Docs</span>
      </button>

      {/* AI Assistant Chat Drawer */}
      <DocsChatDrawer
        isOpen={chatDrawerOpen}
        onClose={() => setChatDrawerOpen(false)}
        initialQuestion={initialQuestion}
      />
    </div>
  );
}
