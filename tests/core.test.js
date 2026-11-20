/* BECCore.sanitizeLink 协议白名单回归：恶意协议必须降级为纯文本（与雅思站 core.test.js 同一威胁模型）。 */
const test = require("node:test");
const assert = require("node:assert");
const Core = require("../assets/core.js");

test("http/https links pass through", () => {
  assert.equal(Core.sanitizeLink("https://example.com/a"), "https://example.com/a");
  assert.equal(Core.sanitizeLink("http://example.com"), "http://example.com");
  assert.equal(Core.sanitizeLink("  https://x.com  "), "https://x.com");
});

test("dangerous protocols are rejected", () => {
  const bad = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox",
    "file:///etc/passwd",
    " javascript:alert(1)",
    "javascript\t:alert(1)",
  ];
  for (const u of bad) assert.equal(Core.sanitizeLink(u), null, `must reject: ${u}`);
});

test("non-strings are rejected", () => {
  for (const u of [undefined, null, 123, {}, ["https://x"]]) {
    assert.equal(Core.sanitizeLink(u), null);
  }
});
