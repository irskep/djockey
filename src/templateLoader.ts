import { Environment, FileSystemLoader } from "nunjucks";
import path from "path";
import { fileURLToPath } from "url";

export function makeNunjucksEnvironment(format: string): [Environment, string] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const templateDir = path.resolve(path.join(__dirname, "templates", format));
  console.log("TEMPLATE DIR:", templateDir);
  return [new Environment(new FileSystemLoader(templateDir)), templateDir];
}
