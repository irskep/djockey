import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyPlugin,
  DjockeyRenderer,
} from "../types.js";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import { CodeBlock, Doc, RawBlock, RawInline, Verbatim } from "@djot/djot";
import * as djotTextmateGrammar from "../djotTextmateGrammar.json" assert { type: "json" };

let nextID = 0;

export class SyntaxHighlightingPlugin implements DjockeyPlugin {
  name = "Syntax Highlighting";

  shiki!: any;

  highlightRequests: Record<string, { text: string; lang: string }> = {};
  highlightResults: Record<string, string> = {};

  djotHighlighter!: any;

  constructor(public config: DjockeyConfigResolved) {}

  async setup() {
    this.shiki = await import("shiki");
    this.djotHighlighter = await this.shiki.createHighlighter({
      langs: [djotTextmateGrammar as unknown],
      themes: ["vitesse-light", "vitesse-dark"],
    });
  }

  async highlight(text: string, lang: string): Promise<string> {
    const themes = {
      light: "vitesse-light",
      dark: "vitesse-dark",
    };

    try {
      if (lang === "djot") {
        return await this.djotHighlighter.codeToHtml(text, {
          lang: lang as unknown,
          themes,
        });
      } else {
        return await this.shiki.codeToHtml(text, {
          lang: lang as unknown,
          themes,
        });
      }
    } catch {
      return await this.shiki.codeToHtml(text, {
        lang: "text",
        themes,
      });
    }
  }

  readDoc(doc: Doc) {
    applyFilter(doc, () => ({
      code_block: (node: CodeBlock) => {
        if (node.attributes?.hlRequestID) return; // Already scheduled

        const hlRequestID = `${nextID++}`;
        this.highlightRequests[hlRequestID] = {
          text: node.text,
          lang: node.lang ?? "text",
        };
        const result: CodeBlock = {
          ...node,
          attributes: { ...node.attributes, hlRequestID },
        };
        return result;
      },
      verbatim: (node: Verbatim) => {
        if (node.attributes?.hlRequestID) return; // Already scheduled

        const nodeClass = node.attributes?.class ?? "";

        const CLASS_PREFIX = "language-";
        const langAttr = nodeClass
          .split(" ")
          .find((cls) => cls.startsWith(CLASS_PREFIX));

        const lang = langAttr ? langAttr.slice(CLASS_PREFIX.length) : "text";
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

  onPass_read(doc: DjockeyDoc) {
    for (const djotDoc of Object.values(doc.docs)) {
      this.readDoc(djotDoc);
    }
  }

  async doAsyncWorkBetweenReadAndWrite(doc: DjockeyDoc) {
    console.log(`Highlighting ${doc.relativePath}...`);
    for (const k of Object.keys(this.highlightRequests)) {
      const v = this.highlightRequests[k];
      this.highlightResults[k] = await this.highlight(v.text, v.lang);
    }
  }

  onPrepareForRender(args: {
    doc: DjockeyDoc;
    renderer: DjockeyRenderer;
    config: DjockeyConfigResolved;
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
            console.error("Unexpectedly can't find highlighted text");
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
            console.error("Unexpectedly can't find highlighted text");
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
