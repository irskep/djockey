import {
  ALL_INPUT_FORMATS,
  DjockeyConfig,
  DjockeyInputFormat,
  MarkdownVariant,
} from "../types.js";

export function getExtensionForInputFormat(fmt: DjockeyInputFormat): string[] {
  switch (fmt) {
    case "gfm":
      return ["md", "markdown"];
    case "djot":
      return ["djot", "dj"];
    case "myst":
      return ["md"];
  }
}

export function getInputFormatForFileExtension(
  ext: string,
  config: DjockeyConfig,
  frontMatter: Record<string, unknown>
): DjockeyInputFormat | null {
  const bareExt = ext[0] === "." ? ext.slice(1) : ext;

  const defaultMarkdownVariant: MarkdownVariant =
    (frontMatter.md_variant as MarkdownVariant | undefined) ??
    config.default_markdown_variant;

  switch (bareExt) {
    case "dj":
      return "djot";
    case "djot":
      return "djot";
    case "md":
      return defaultMarkdownVariant;
    case "markdown":
      return defaultMarkdownVariant;
    default:
      return null;
  }
}
