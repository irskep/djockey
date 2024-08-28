import { Doc, Inline } from "@djot/djot";
import { Environment } from "nunjucks";

export type DjockeyConfig = {
  input_dir: string;
  output_dir: Record<DjockeyOutputFormat, string>;
  url_root?: string;
  site_name: string;

  project_info?: {
    version?: string;
    github_url?: string;
  };

  static?: {
    ignore?: string[];
  };

  num_passes: number;

  plugins: string[];

  html: {
    footer_text: string;
    ignore_css?: string[];
  };

  features?: {
    syntax_highlighting?: {
      theme_light: string;
      theme_dark: string;
    };
  };
};

export type DjockeyConfigResolved = DjockeyConfig & {
  rootPath: string;
  fileList: string[];
  url_root: string;
};

export type DjockeyDoc = {
  docs: { content: Doc } & Record<string, Doc>;
  title: string;
  titleAST: Inline[];
  originalExtension: string;
  absolutePath: string;
  relativePath: string;
  filename: string;
  frontMatter: Record<string, unknown>;

  // For use by plugins
  data: Record<string, unknown>;
};

// These correspond to pandoc formats. Keep these two lines in sync.
export type DjockeyInputFormat = "djot" | "gfm";
export const ALL_INPUT_FORMATS: DjockeyInputFormat[] = ["djot", "gfm"];

// Keep these two lines in sync.
export type DjockeyOutputFormat = "html" | "gfm";
export const ALL_OUTPUT_FORMATS: DjockeyOutputFormat[] = ["html", "gfm"];

export type DjockeyRenderer = {
  identifier: DjockeyOutputFormat;

  handleStaticFiles: (
    templateDir: string,
    config: DjockeyConfigResolved,
    docs: DjockeyDoc[]
  ) => void;

  writeDoc: (args: {
    config: DjockeyConfig;
    nj: Environment;
    doc: DjockeyDoc;
    context: Record<string, unknown>;
  }) => void;

  transformLink: (args: {
    config: DjockeyConfigResolved;
    sourcePath: string;
    anchorWithoutHash: string | null;
    docOriginalExtension: string;
    docRelativePath: string;
    isLinkToStaticFile: boolean;
  }) => string;
};

/**
 * Notes:
 * - Passes should be idempotent so they can be run multiple times
 */
export type DjockeyPlugin = {
  name: string;

  setup?: () => Promise<void>;

  onPass_read?: (doc: DjockeyDoc) => void;

  doAsyncWorkBetweenReadAndWrite?: (doc: DjockeyDoc) => Promise<void>;

  onPass_write?: (doc: DjockeyDoc) => void;

  onPrepareForRender?: (args: {
    doc: DjockeyDoc;
    renderer: DjockeyRenderer;
    config: DjockeyConfigResolved;
  }) => void;
};

export type DjockeyPluginModule = {
  makePlugin: (config: DjockeyConfig) => DjockeyPlugin;
};
