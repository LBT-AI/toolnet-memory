export function looksLikeDecision(
  text: string,
): boolean {
  const value =
    text.toLowerCase();

  return [
    "quyết định",
    "chọn ",
    "sử dụng ",
    "dùng ",
    "decided",
    "decision",
    "we will use",
    "use ",
  ].some(
    (pattern) =>
      value.includes(pattern),
  );
}
