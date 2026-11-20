/* BECCore — 共享基础模块：外链协议白名单。
   浏览器与 Node 双端可用（window.BECCore / require）。
   安全约定：RSS 标题/链接是外部不可信数据——标题一律 textContent 渲染；
   外链仅放行 http(s)，其余协议（javascript:、data: 等）降级为无 href 的纯文本。
   与雅思站/高口站 core.js 的 sanitizeLink 同一约定，四站逐步收敛到同一实现。 */
(function (global) {
  "use strict";

  var SAFE_LINK = /^https?:\/\//i;

  /* 仅放行 http/https；返回规范化 URL 或 null（null 表示按纯文本渲染）。 */
  function sanitizeLink(url) {
    if (typeof url !== "string") return null;
    var u = url.trim();
    return SAFE_LINK.test(u) ? u : null;
  }

  var BECCore = { sanitizeLink: sanitizeLink };

  if (typeof module !== "undefined" && module.exports) module.exports = BECCore;
  else global.BECCore = BECCore;
})(typeof globalThis !== "undefined" ? globalThis : this);
