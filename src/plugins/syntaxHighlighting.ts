import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyPlugin,
  DjockeyRenderer,
} from "../types.js";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import {
  AstNode,
  CodeBlock,
  Doc,
  RawBlock,
  RawInline,
  Verbatim,
} from "@djot/djot";
import {
  BundledLanguage,
  bundledLanguages,
  BundledTheme,
  codeToHtml,
  createHighlighter,
  HighlighterGeneric,
  LanguageRegistration,
} from "shiki/index.mjs";
import djotTextmateGrammar from "../djotTextmateGrammar.js";
import { showPromiseListAsProgressBar } from "../utils/asyncUtils.js";
import { LogCollector } from "../utils/logUtils.js";

let nextID = 0;

export class SyntaxHighlightingPlugin implements DjockeyPlugin {
  name = "Syntax Highlighting";

  languages = new Set(["djot", "text"].concat(Object.keys(bundledLanguages)));

  highlightRequests: Record<string, { text: string; lang: string }> = {};
  highlightResults: Record<string, string> = {};

  djotHighlighter!: HighlighterGeneric<BundledLanguage, BundledTheme>;

  themeLight: string;
  themeDark: string;

  constructor(public config: DjockeyConfigResolved) {
    this.themeLight =
      config.features?.syntax_highlighting?.theme_light ?? "vitesse-light";
    this.themeDark =
      config.features?.syntax_highlighting?.theme_dark ?? "vitesse-dark";
  }

  getNodeLang(
    doc: DjockeyDoc,
    lang: string | undefined | null,
    configKey: "default_code_block_language" | "default_inline_language"
  ): string | null {
    let defaultLanguage = "text";
    if (doc.frontMatter[configKey]) {
      defaultLanguage = doc.frontMatter[configKey] as string;
    } else if (
      this.config.features?.syntax_highlighting &&
      this.config.features.syntax_highlighting[configKey]
    ) {
      defaultLanguage = this.config.features.syntax_highlighting[configKey];
    } else {
      defaultLanguage = "text";
    }

    if (!lang) return defaultLanguage;
    if (this.languages.has(lang)) return lang;
    if (lang === "plaintext") return "text";

    return defaultLanguage;
  }

  async setup() {
    this.djotHighlighter = await createHighlighter({
      langs: [djotTextmateGrammar as unknown as LanguageRegistration],
      themes: [this.themeLight, this.themeDark],
    });
  }

  async highlight(text: string, lang: string): Promise<string> {
    const themes = {
      light: this.themeLight,
      dark: this.themeDark,
    };

    try {
      if (lang === "djot") {
        return await this.djotHighlighter.codeToHtml(text, {
          lang: lang as BundledLanguage,
          themes,
        });
      } else {
        return await codeToHtml(text, {
          lang: lang as BundledLanguage,
          themes,
        });
      }
    } catch {
      return await codeToHtml(text, {
        lang: "text",
        themes,
      });
    }
  }

  readDoc(
    doc: Doc,
    djockeyDoc: DjockeyDoc,
    getIsNodeReservedByAnotherPlugin: (node: AstNode) => boolean
  ) {
    applyFilter(doc, () => ({
      code_block: (node: CodeBlock) => {
        if (getIsNodeReservedByAnotherPlugin(node)) return;
        if (node.attributes?.hlRequestID) return; // Already scheduled

        const lang = this.getNodeLang(
          djockeyDoc,
          node.lang,
          "default_code_block_language"
        );
        if (!lang) return;

        const hlRequestID = `${nextID++}`;
        this.highlightRequests[hlRequestID] = {
          text: node.text,
          lang,
        };
        const result: CodeBlock = {
          ...node,
          attributes: { ...node.attributes, hlRequestID },
        };
        return result;
      },
      verbatim: (node: Verbatim) => {
        if (getIsNodeReservedByAnotherPlugin(node)) return;
        if (node.attributes?.hlRequestID) return; // Already scheduled

        const nodeClass = node.attributes?.class ?? "";

        const CLASS_PREFIX = "language-";
        const langAttr = nodeClass
          .split(" ")
          .find((cls) => cls.startsWith(CLASS_PREFIX));

        const lang = this.getNodeLang(
          djockeyDoc,
          langAttr ? langAttr.slice(CLASS_PREFIX.length) : null,
          "default_inline_language"
        );
        if (!lang) return;

        const hlRequestID = `${nextID++}`;
        this.highlightRequests[hlRequestID] = {
          text: node.text,
          lang,
        };

        const result: Verbatim = {
          ...node,
          attributes: { ...node.attributes, hlRequestID },
        };
        return result;
      },
    }));
  }

  onPass_read(args: {
    doc: DjockeyDoc;
    getIsNodeReservedByAnotherPlugin: (node: AstNode) => boolean;
  }) {
    const { doc } = args;
    for (const djotDoc of Object.values(doc.docs)) {
      this.readDoc(djotDoc, doc, args.getIsNodeReservedByAnotherPlugin);
    }
  }

  async doAsyncWorkBetweenReadAndWrite(args: { doc: DjockeyDoc }) {
    const { doc } = args;
    await showPromiseListAsProgressBar(
      "Highlighting code blocks",
      Object.keys(this.highlightRequests).map((k) => {
        const v = this.highlightRequests[k];
        delete this.highlightRequests[k];
        return this.highlight(v.text, v.lang).then(
          (result) => (this.highlightResults[k] = result)
        );
      })
    );
  }

  onPrepareForRender(args: {
    doc: DjockeyDoc;
    renderer: DjockeyRenderer;
    config: DjockeyConfigResolved;
    logCollector: LogCollector;
  }) {
    const { doc, renderer } = args;

    // Only highlight HTML
    if (renderer.identifier !== "html") return;

    for (const djotDoc of Object.values(doc.docs)) {
      applyFilter(djotDoc, () => ({
        code_block: (node: CodeBlock) => {
          const hlRequestID = node.attributes?.hlRequestID;
          if (!hlRequestID) return;
          const newText = this.highlightResults[hlRequestID];
          if (!newText) {
            return;
          }
          const result: RawBlock = {
            tag: "raw_block",
            format: "html",
            text: newText,
          };
          return result;
        },
        verbatim: (node: Verbatim) => {
          const hlRequestID = node.attributes?.hlRequestID;
          if (!hlRequestID) return;
          let newText = this.highlightResults[hlRequestID];
          if (!newText) {
            return;
          }

          // Shiki insists on rendering <pre> tags, so just switch them to <span>
          const OLD_PREFIX = "<pre ";
          const OLD_SUFFIX = "</pre>";
          newText =
            "<span " +
            newText.slice(
              OLD_PREFIX.length,
              newText.length - OLD_SUFFIX.length
            ) +
            "</span>";

          const result: RawInline = {
            tag: "raw_inline",
            format: "html",
            text: newText,
          };

          return result;
        },
      }));
    }
  }
}
