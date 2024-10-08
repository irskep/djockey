import { AstNode, Doc, Inline } from "@djot/djot";
import { Environment } from "nunjucks";
import { LogCollector } from "./utils/logUtils.js";
import { mystParse } from "myst-parser";
import { PhrasingContent } from "mdast";

export interface LinkMappingConfig {
  path: string;
  url_root: string;
}

export type MarkdownVariant = "gfm" | "myst";

export interface DjockeyConfig {
  input_dir: string;
  output_dir: Record<DjockeyOutputFormat, string>;
  url_root?: string;
  site_name: string;
  default_markdown_variant: MarkdownVariant;

  project_info?: {
    version?: string;
    github_url?: string;
    description?: string;
    social_image?: string;
  };

  num_passes: number;

  plugins: string[];

  gfm: {
    ignore_static: string[];
  };

  link_mappings?: LinkMappingConfig[];

  html: {
    extra_static_dirs?: {
      path: string;
      prefix?: string;
      patterns?: string[];
      exclude_patterns?: string[];
    }[];
    footer_text: string;
    ignore_css?: string[];
    ignore_static: string[];
  };

  features?: {
    syntax_highlighting?: {
      default_code_block_language: string;
      default_inline_language: string;
      theme_light: string;
      theme_dark: string;
    };
  };
}

export interface DjockeyConfigResolved extends DjockeyConfig {
  rootPath: string;
  fileList: string[];
  url_root: string;
  default_markdown_variant: "gfm" | "myst";
  link_mappings: LinkMappingConfig[];
}

export type MystDoc = ReturnType<typeof mystParse>;
export type PolyglotDoc_Djot = { kind: "djot"; value: Doc };
export type PolyglotDoc_MDAST = {
  kind: "mdast";
  value: MystDoc;
};

export type PolyglotDoc = PolyglotDoc_Djot | PolyglotDoc_MDAST;

export interface DjockeyDoc {
  docs: { content: PolyglotDoc } & Record<string, PolyglotDoc>;
  title: string;
  titleASTDjot: Inline[];
  titleASTMyst: PhrasingContent[];
  originalExtension: string;
  fsPath: string;
  refPath: string;
  filename: string;
  frontMatter: Record<string, unknown>;

  neighbors?: {
    next?: DjockeyDoc;
    previous?: DjockeyDoc;
    parent?: DjockeyDoc;
  };

  // For use by plugins
  data: Record<string, unknown>;
}

// These correspond to pandoc formats. Keep these two lines in sync.
export type DjockeyInputFormat = "djot" | "gfm" | "myst";
export const ALL_INPUT_FORMATS: DjockeyInputFormat[] = ["djot", "gfm", "myst"];

// Keep these two lines in sync.
export type DjockeyOutputFormat = "html" | "gfm";
export const ALL_OUTPUT_FORMATS: DjockeyOutputFormat[] = ["html", "gfm"];

export type DjockeyRenderer = {
  identifier: DjockeyOutputFormat;

  handleStaticFiles: (args: {
    templateDir: string;
    config: DjockeyConfigResolved;
    docs: DjockeyDoc[];
    staticFilesFromPlugins: DjockeyStaticFileFromPlugin[];
    logCollector: LogCollector;
  }) => Promise<void>;

  writeDoc: (args: {
    config: DjockeyConfigResolved;
    nj: Environment;
    doc: DjockeyDoc;
    staticFileFilterFunctions: DjockeyPlugin["getShouldIncludeStaticFileInDoc"][];
    logCollector: LogCollector;
  }) => Promise<void>;

  transformLink: (args: {
    config: DjockeyConfigResolved;
    sourcePath: string;
    anchorWithoutHash: string | null;
    docOriginalExtension: string;
    docRefPath: string;
    isLinkToStaticFile: boolean;
    logCollector: LogCollector;
  }) => string;
};

export interface DjockeyPlugin {
  name: string;

  getNodeReservations?: (
    config: DjockeyConfigResolved
  ) => DjockeyPluginNodeReservation[];

  setup?: (args: { logCollector: LogCollector }) => Promise<void>;

  onPass_read?: (args: {
    doc: DjockeyDoc;
    logCollector: LogCollector;
    getIsNodeReservedByAnotherPlugin: (node: AstNode) => boolean;
  }) => void;

  doAsyncWorkBetweenReadAndWrite?: (args: {
    doc: DjockeyDoc;
    logCollector: LogCollector;
  }) => Promise<void>;

  onPass_write?: (args: {
    doc: DjockeyDoc;
    logCollector: LogCollector;
    getIsNodeReservedByAnotherPlugin: (node: AstNode) => boolean;
  }) => void;

  onPrepareForRender?: (args: {
    doc: DjockeyDoc;
    renderer: DjockeyRenderer;
    config: DjockeyConfigResolved;
    logCollector: LogCollector;
  }) => void;

  getStaticFiles?: (args: {
    docs: DjockeyDoc[];
    renderer: DjockeyRenderer;
    config: DjockeyConfigResolved;
    logCollector: LogCollector;
  }) => DjockeyStaticFileFromPlugin[];

  getShouldIncludeStaticFileInDoc?: (args: {
    doc: DjockeyDoc;
    staticFileRefPath: string;
  }) => boolean;
}

export interface DjockeyPluginNodeReservation {
  match: (node: AstNode) => Boolean;
}

export interface DjockeyPluginModule {
  makePlugin: (config: DjockeyConfig) => DjockeyPlugin;
}

export interface DjockeyStaticFileFromPlugin {
  refPath: string;
  contents: string;
}

/* LINK MAPPINGS */

export interface DjockeyLinkMapping {
  linkDestination: string;
  relativeURL: string;
  defaultLabel: string;
}

export interface DjockeyLinkMappingDoc {
  version: number;
  namespaces: string[];
  linkMappings: DjockeyLinkMapping[];
}
