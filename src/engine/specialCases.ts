import { HTMLRenderer } from "@djot/djot";
import { DjockeyDoc } from "../types.js";

export const SPECIAL_CASE_REPO_README = "repo_readme";
export const PATHS_NOT_IN_NORMAL_OUTPUT = new Set([SPECIAL_CASE_REPO_README]);

export function doSpecialCaseWrite(doc: DjockeyDoc, renderer: HTMLRenderer) {}
