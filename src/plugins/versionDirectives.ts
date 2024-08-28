import { DjockeyConfig, DjockeyDoc, DjockeyPlugin } from "../types.js";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import { getAnyAttribute } from "../util.js";
import { Block } from "@djot/djot";

function normalizeSemverString(semverString: string): [number, number, number] {
  const parts: number[] = semverString
    .split(".")
    .map((s) => parseInt(s, 10))
    .slice(0, 3);
  while (parts.length < 3) parts.push(0);
  return parts as [number, number, number];
}

function isSemverGreaterOrEqual(a: string, b: string): boolean {
  const aParts = normalizeSemverString(a);
  const bParts = normalizeSemverString(b);
  for (let i = 0; i < 3; i++) {
    if (aParts[i] > bParts[i]) return true;
    if (aParts[i] < bParts[i]) return false;
  }
  return true;
}

type Cls =
  | "added-in-version"
  | "changed-in-version"
  | "removed-in-version"
  | "deprecated-in-version";
const PREFIXES_CURRENT: Record<Cls, string> = {
  "added-in-version": "Added in version",
  "changed-in-version": "Changed in version",
  "removed-in-version": "Removed in version",
  "deprecated-in-version": "Deprecated in version",
};

const PREFIXES_FUTURE: Record<Cls, string> = {
  "added-in-version": "Will be added in version",
  "changed-in-version": "Will be changed in version",
  "removed-in-version": "Will be reemoved in version",
  "deprecated-in-version": "Will be deprecated in version",
};

export class VersionDirectivesPlugin implements DjockeyPlugin {
  name = "Version Directives";

  constructor(public config: DjockeyConfig) {}

  onPass_write(doc: DjockeyDoc) {
    const projectVersion = this.config.projectInfo?.version;
    applyFilter(doc.docs.content, () => ({
      div: (node) => {
        const keyAndValue = getAnyAttribute(
          node,
          Object.keys(PREFIXES_CURRENT)
        );
        if (!keyAndValue) return;
        const [key, value] = keyAndValue;

        // If no project version, assume it's already release. Otherwise, put it in the future.
        const prefix =
          !projectVersion || isSemverGreaterOrEqual(projectVersion, value)
            ? PREFIXES_CURRENT[key as Cls]
            : PREFIXES_FUTURE[key as Cls];
        return buildAST(key, `${prefix} ${value}`, node.children);
      },
    }));
  }
}

function buildAST(cls: string, text: string, children: Block[]): Block {
  return {
    tag: "div",
    attributes: { class: `version-modified ${cls}` },
    children: [
      {
        tag: "para",
        attributes: { class: "primary" },
        children: [{ tag: "str", text }],
      },
      ...structuredClone(children),
    ],
  };
}
