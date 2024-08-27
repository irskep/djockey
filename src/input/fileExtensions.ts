import { ALL_INPUT_FORMATS, DjockeyInputFormat } from "../types.js";

export function getExtensionForInputFormat(fmt: DjockeyInputFormat): string[] {
  switch (fmt) {
    case "gfm":
      return ["md"];
    case "djot":
      return ["djot"];
  }
}

const extToFormat: Record<string, DjockeyInputFormat> = {};
for (const fmt of ALL_INPUT_FORMATS) {
  for (const ext of getExtensionForInputFormat(fmt)) {
    extToFormat[ext] = fmt;
  }
}

export function getInputFormatForFileExtension(
  ext: string
): DjockeyInputFormat | null {
  if (ext[0] === ".") {
    return extToFormat[ext.slice(1)] || null;
  } else {
    return extToFormat[ext] || null;
  }
}
