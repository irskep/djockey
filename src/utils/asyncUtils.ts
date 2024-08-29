import { print } from "gluegun";

export async function showPromiseListAsProgressBar<T>(
  text: string,
  promises: Promise<T>[]
): Promise<T[]> {
  if (!promises.length) return [];

  const loader = print.spin(text);
  loader.start();
  const result = await Promise.all(promises);
  loader.succeed();
  return result;
}
