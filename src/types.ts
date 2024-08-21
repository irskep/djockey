import { Doc } from "@djot/djot";
import { Environment } from "nunjucks";

export type DjockeyDoc = {
  djotDoc: Doc;
  title: string;
  originalExtension: string;
  absolutePath: string;
  relativePath: string;
  filename: string;
  frontMatter: Record<string, unknown>;

  extraDocs: Record<string, Doc>;

  // For use by plugins
  data: Record<string, unknown>;
};

export function getAllDjotDocs(djockeyDoc: DjockeyDoc): Doc[] {
  const result: Doc[] = [djockeyDoc.djotDoc];
  for (const extraDoc of Object.values(djockeyDoc.extraDocs)) {
    result.push(extraDoc);
  }
  return result;
}

// These correspond to pandoc formats
export type DjockeyInputFormat = "djot" | "gfm";

// Keep these in sync
export type DjockeyOutputFormat = "html" | "gfm";
export const ALL_OUTPUT_FORMATS: DjockeyOutputFormat[] = ["html", "gfm"];

export type DjockeyConfig = {
  inputDir: string;
  outputDir: Record<DjockeyOutputFormat, string>;
  fileList?: string[];
  urlRoot?: string;
  inputFormats: Partial<Record<DjockeyInputFormat, boolean>>;
  outputFormats: Partial<Record<DjockeyOutputFormat, boolean>>;
  numPasses: number;
};

export type DjockeyConfigResolved = DjockeyConfig & {
  rootPath: string;
  fileList: string[];
  urlRoot: string;
};

export type DjockeyRenderer = {
  identifier: DjockeyOutputFormat;

  writeDoc: (args: {
    config: DjockeyConfig;
    nj: Environment;
    doc: DjockeyDoc;
    title: string;
  }) => void;

  transformLink: (args: {
    config: DjockeyConfigResolved;
    sourcePath: string;
    anchorWithoutHash: string | null;
    docOriginalExtension: string;
    docRelativePath: string;
  }) => string;
};

/**
 * Notes:
 * - Passes should be idempotent so they can be run multiple times
 */
export type DjockeyPlugin = {
  onPass_read?: (doc: DjockeyDoc) => void;
  onPass_write?: (doc: DjockeyDoc) => void;
  onPrepareForRender?: (doc: DjockeyDoc, renderer: DjockeyRenderer) => void;
};
