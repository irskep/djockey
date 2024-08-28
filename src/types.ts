import { Doc, Inline } from "@djot/djot";
import { Environment } from "nunjucks";

export type DjockeyConfig = {
  inputDir: string;
  outputDir: Record<DjockeyOutputFormat, string>;
  urlRoot?: string;
  inputFormats: Partial<Record<DjockeyInputFormat, boolean>>;
  numPasses: number;
  siteName: string;

  projectInfo?: {
    version?: string;
    githubURL?: string;
  };

  static?: {
    copyIgnorePatterns?: string[];
  };

  plugins: string[];

  html: {
    footerText: string;
    cssIgnorePatterns?: string[];
    linkCSSToInputInsteadOfOutput: boolean;
  };
};

export type DjockeyConfigResolved = DjockeyConfig & {
  rootPath: string;
  fileList: string[];
  urlRoot: string;
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
