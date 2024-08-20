import { Doc } from "@djot/djot";

export type DjockeyDoc = {
  djotDoc: Doc;
  title: string;
  originalExtension: string;
  absolutePath: string;
  relativePath: string;
  filename: string;
  frontMatter: Record<string, unknown>;

  // For use by plugins
  data: Record<string, unknown>;
};
