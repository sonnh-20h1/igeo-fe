export function formatMessage(
  message: string,
  values: Record<string, string | number>,
) {
  return message.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
