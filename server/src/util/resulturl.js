// The result URL comes from the result file that the test writes, so a
// test can set it. Only let http(s) URLs through, to stop javascript: URLs.
export function safeResultUrl(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? url : undefined;
  } catch {
    return;
  }
}
