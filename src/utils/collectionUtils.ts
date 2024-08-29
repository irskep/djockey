export function pushToListIfNotPresent<T>(
  dict: Record<string, T[]>,
  k: string,
  v: T,
  checkEquality: (a: T, b: T) => boolean
) {
  const array = dict[k] ?? [];
  dict[k] = array;
  if (array.findIndex((innerValue) => checkEquality(v, innerValue)) >= 0)
    return;
  array.push(v);
}

export function pushToList<T>(dict: Record<string, T[]>, k: string, v: T) {
  const array = dict[k] ?? [];
  dict[k] = array;
  array.push(v);
}
