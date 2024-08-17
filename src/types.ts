import { AstNode, Doc } from "@djot/djot";

export type DjockeyDoc = {
  djotDoc: Doc;
  path: string;
  filename: string;
  frontMatter: Record<string, unknown>;
};

export type DjockeyAstNode = AstNode & {
  id?: number;
};
