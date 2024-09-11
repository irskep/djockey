import {
  ALL_INPUT_FORMATS,
  DjockeyConfig,
  DjockeyInputFormat,
  MarkdownVariant,
} from "../types.js";

export function getExtensionForInputFormat(fmt: DjockeyInputFormat): string[] {
  switch (fmt) {
    case "gfm":
      return [".md", ".markdown"];
    case "djot":
      return [".djot", ".dj"];
    case "myst":
      return [".myst.md", ".md"];
    case "commonmark":
      return [".common.md", ".md", ".markdown"];
  }
  throw new Error("Unknown format: " + fmt);
}

export function getInputFormatForFileName(
  filename: string,
  config: DjockeyConfig,
  frontMatter: Record<string, unknown>
): DjockeyInputFormat | null {
  const defaultMarkdownVariant: MarkdownVariant =
    (frontMatter.md_variant as MarkdownVariant | undefined) ??
    config.default_markdown_variant;

  for (const fmt of ALL_INPUT_FORMATS) {
    for (const ext of getExtensionForInputFormat(fmt)) {
      // Double-extensions disambiguate between Markdown formats.
      if (ext.split(".").length > 2 && filename.endsWith(ext)) {
        return fmt;
      }
    }
  }

  // If we didn't find a totally unambiguous extension, try Markdown.
  const mdExts = [".md", ".markdown"];
  for (const ext of mdExts) {
    if (filename.endsWith(ext)) {
      return defaultMarkdownVariant;
    }
  }

  // Otherwise, try everything else.
  for (const fmt of ALL_INPUT_FORMATS) {
    for (const ext of getExtensionForInputFormat(fmt)) {
      if (filename.endsWith(ext)) {
        return fmt;
      }
    }
  }

  console.error("Can't figure out format for", filename);

  return null;
}
