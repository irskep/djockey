import { AstNode, Doc, Inline } from "@djot/djot";
import { Environment } from "nunjucks";
import { LogCollector } from "./utils/logUtils.js";

export interface LinkMappingConfig {
  path: string;
  url_root: string;
}

export interface DjockeyConfig {
  input_dir: string;
  output_dir: Record<DjockeyOutputFormat, string>;
  url_root?: string;
  site_name: string;

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
    extra_static_dirs: {
      path: string;
      patterns: string[];
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
  link_mappings: LinkMappingConfig[];
}

export interface DjockeyDoc {
  docs: { content: Doc } & Record<string, Doc>;
  title: string;
  titleAST: Inline[];
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
export type DjockeyInputFormat = "djot" | "gfm";
export const ALL_INPUT_FORMATS: DjockeyInputFormat[] = ["djot", "gfm"];

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
}

export interface DjockeyPluginNodeReservation {
  match: (node: AstNode) => Boolean;
}

export interface DjockeyPluginModule {
  makePlugin: (config: DjockeyConfig) => DjockeyPlugin;
}

export interface DjockeyStaticFileFromPlugin {
  path: string;
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
