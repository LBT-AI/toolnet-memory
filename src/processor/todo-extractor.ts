export function looksLikeTodo(text: string): boolean {
  const value = text.toLowerCase();

  return ['todo', 'cần làm', 'chưa xong', 'còn phải', 'next:', 'next step', 'pending'].some(
    (pattern) => value.includes(pattern)
  );
}
