export function looksLikeRule(
  text: string,
): boolean {
  const value =
    text.toLowerCase();

  return [
    "không được",
    "bắt buộc",
    "phải luôn",
    "tuyệt đối",
    "never ",
    "must ",
    "always ",
    "do not ",
  ].some(
    (pattern) =>
      value.includes(pattern),
  );
}
