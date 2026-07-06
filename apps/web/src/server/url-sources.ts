import type { Locale } from "@ronr/contracts";

type UrlSourceReference = {
  id: string;
  type: "url_input";
  title: string;
  summary: string;
  url: string;
  fetchStatus: "completed" | "failed";
  fetchErrorCode?: string;
  readAt: string;
  confirmedByUser: true;
};

const maxUrlSources = 5;
const maxFetchedBytes = 512 * 1024;
const maxSummaryCharacters = 2000;
const fetchTimeoutMs = 8000;
const maxRedirects = 3;
const supportedContentTypes = [
  "text/html",
  "application/xhtml+xml",
  "text/plain",
  "application/json",
  "text/markdown"
];

type UrlSourceResult = {
  sourceReferences: UrlSourceReference[];
};

type FetchedPublicUrl = {
  response: Response;
  text?: string;
};

type FetchErrorCode =
  | "url_private_address"
  | "url_redirect_private_address"
  | "url_redirect_limit"
  | "url_fetch_failed"
  | "url_fetch_timeout"
  | "url_http_error"
  | "url_unsupported_content_type"
  | "url_response_too_large"
  | "url_empty_content"
  | "url_access_restricted";

export function extractHttpUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"'`\u3000，。！？；、]+/gi) ?? [];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const match of matches) {
    const normalized = normalizeExtractedUrl(match);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
    if (urls.length >= maxUrlSources) break;
  }
  return urls;
}

export function stripExtractedUrls(text: string): string {
  return extractHttpUrls(text)
    .reduce((current, url) => current.replaceAll(url, " "), text)
    .replace(/https?:\/\/[^\s<>"'`\u3000，。！？；、]+/gi, " ")
    .replace(/\s+[，,。.;；:：!?！？、]\s*/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function buildUrlSourceReferences(
  userQuestion: string,
  fetchImpl: typeof fetch = fetch,
  locale: Locale = "zh-CN"
): Promise<UrlSourceResult> {
  const urls = extractHttpUrls(userQuestion);
  const sourceReferences = await Promise.all(urls.map((url, index) => fetchUrlSource(url, index, fetchImpl, locale)));
  return { sourceReferences };
}

async function fetchUrlSource(
  url: string,
  index: number,
  fetchImpl: typeof fetch,
  locale: Locale
): Promise<UrlSourceReference> {
  const readAt = new Date().toISOString();
  const id = `source-url-${index + 1}`;
  const parsed = new URL(url);
  const fallbackTitle = parsed.hostname;

  if (!isPublicHttpUrl(parsed)) {
    return failedSource({ id, url, title: fallbackTitle, readAt, code: "url_private_address" });
  }

  try {
    const fetched = await fetchPublicUrl(url, fetchImpl, locale);
    return buildCompletedSource({ fetched, id, url, fallbackTitle, readAt });
  } catch (error) {
    if (error instanceof UrlFetchError) {
      return failedSource({ id, url, title: fallbackTitle, readAt, code: error.code });
    }
    return failedSource({
      id,
      url,
      title: fallbackTitle,
      readAt,
      code: error instanceof Error && error.name === "TimeoutError"
        ? "url_fetch_timeout"
        : "url_fetch_failed"
    });
  }
}

async function fetchPublicUrl(url: string, fetchImpl: typeof fetch, locale: Locale): Promise<FetchedPublicUrl> {
  let currentUrl = url;
  let referrerUrl: string | undefined;
  const cookieJar = new BrowserNavigationCookieJar();
  for (let navigationCount = 0; navigationCount <= maxRedirects; navigationCount += 1) {
    const requestUrl = new URL(currentUrl);
    const response = await fetchImpl(currentUrl, {
      method: "GET",
      headers: buildBrowserNavigationHeaders({
        secFetchSite: buildSecFetchSite(requestUrl, referrerUrl),
        referrerUrl,
        cookieHeader: cookieJar.cookieHeaderFor(requestUrl),
        locale
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(fetchTimeoutMs)
    });
    cookieJar.storeFromResponse(requestUrl, response.headers);

    const httpRedirectUrl = getHttpRedirectUrl(response, currentUrl);
    if (httpRedirectUrl) {
      if (!isPublicHttpUrl(httpRedirectUrl)) {
        throw new UrlFetchError("url_redirect_private_address");
      }
      referrerUrl = currentUrl;
      currentUrl = httpRedirectUrl.toString();
      continue;
    }

    const htmlRead = await readHtmlForMetaRefresh(response);
    if (!htmlRead) {
      return { response };
    }

    const htmlBaseUrl = htmlBaseUrlForNavigation(htmlRead.text, currentUrl);
    const metaRefreshUrl = extractMetaRefreshUrl(htmlRead.text, htmlBaseUrl);
    const htmlNavigationUrl = metaRefreshUrl ?? extractCanonicalNavigationUrl(htmlRead.text, htmlBaseUrl);
    if (!htmlNavigationUrl) {
      return { response, text: htmlRead.text };
    }
    if (!isPublicHttpUrl(htmlNavigationUrl)) {
      throw new UrlFetchError("url_redirect_private_address");
    }
    if (!metaRefreshUrl && new URL(currentUrl).origin !== htmlNavigationUrl.origin) {
      return { response, text: htmlRead.text };
    }
    referrerUrl = currentUrl;
    currentUrl = htmlNavigationUrl.toString();
  }

  throw new UrlFetchError("url_redirect_limit");
}

function buildSecFetchSite(url: URL, referrerUrl: string | undefined): "none" | "same-origin" | "cross-site" {
  if (!referrerUrl) return "none";
  return new URL(referrerUrl).origin === url.origin ? "same-origin" : "cross-site";
}

function buildBrowserNavigationHeaders(input: {
  secFetchSite: "none" | "same-origin" | "cross-site";
  referrerUrl?: string;
  cookieHeader?: string;
  locale: Locale;
}): HeadersInit {
  return compactHeaders({
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,application/json;q=0.7,*/*;q=0.5",
    "Accept-Language": acceptLanguageForLocale(input.locale),
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    ...(input.cookieHeader ? { Cookie: input.cookieHeader } : {}),
    ...(input.referrerUrl ? { Referer: input.referrerUrl } : {}),
    "Sec-Ch-Ua": "\"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\", \"Not-A.Brand\";v=\"99\"",
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": "\"macOS\"",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": input.secFetchSite,
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
  });
}

function acceptLanguageForLocale(locale: Locale): string {
  const fallback = "en;q=0.8,zh-CN;q=0.7,zh;q=0.6,ja;q=0.5,ko;q=0.4";
  const byLocale: Record<Locale, string> = {
    "zh-CN": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.6,ko;q=0.5",
    "zh-TW": "zh-TW,zh-Hant;q=0.9,zh;q=0.8,en;q=0.7,ja;q=0.5,ko;q=0.4",
    en: `en-US,en;q=0.9,${fallback}`,
    ja: `ja-JP,ja;q=0.9,${fallback}`,
    ko: `ko-KR,ko;q=0.9,${fallback}`
  };
  return byLocale[locale];
}

function compactHeaders(headers: Record<string, string | undefined>): HeadersInit {
  return Object.fromEntries(Object.entries(headers).filter((entry): entry is [string, string] => Boolean(entry[1])));
}

function getHttpRedirectUrl(response: Response, currentUrl: string): URL | null {
  if (![301, 302, 303, 307, 308].includes(response.status)) return null;
  const location = response.headers.get("Location");
  return location ? new URL(location, currentUrl) : null;
}

async function readHtmlForMetaRefresh(response: Response): Promise<{ text: string } | null> {
  const contentType = responseContentType(response);
  if (!responseContentTypeLooksLikeHtml(contentType)) return null;
  try {
    return { text: await readLimitedResponseText(response, { allowPartial: true }) };
  } catch {
    return null;
  }
}

class BrowserNavigationCookieJar {
  private readonly cookies = new Map<string, string>();

  cookieHeaderFor(url: URL): string | undefined {
    const pairs = [...this.cookies.entries()]
      .filter(([key]) => key.startsWith(`${url.hostname}\t`))
      .map(([, cookie]) => cookie);
    return pairs.length > 0 ? pairs.join("; ") : undefined;
  }

  storeFromResponse(url: URL, headers: Headers): void {
    for (const value of getSetCookieHeaders(headers)) {
      const cookie = parseSetCookie(value);
      if (!cookie) continue;
      const domain = cookie.domain ?? url.hostname;
      if (!isSameSiteCookieDomain(url.hostname, domain)) continue;
      this.cookies.set(`${domain}\t${cookie.name}`, `${cookie.name}=${cookie.value}`);
    }
  }
}

function getSetCookieHeaders(headers: Headers): string[] {
  const maybeHeadersWithGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const values = maybeHeadersWithGetSetCookie.getSetCookie?.();
  if (values && values.length > 0) return values;
  const combined = headers.get("Set-Cookie");
  return combined ? splitCombinedSetCookieHeader(combined) : [];
}

function splitCombinedSetCookieHeader(value: string): string[] {
  return value.split(/,(?=\s*[^;,=\s]+=[^;,]*)/g).map((cookie) => cookie.trim()).filter(Boolean);
}

function parseSetCookie(value: string): { name: string; value: string; domain?: string } | null {
  const [pair, ...attributes] = value.split(";").map((part) => part.trim());
  const separatorIndex = pair.indexOf("=");
  if (separatorIndex <= 0) return null;
  const name = pair.slice(0, separatorIndex);
  const cookieValue = pair.slice(separatorIndex + 1);
  const domainAttribute = attributes
    .map((attribute) => attribute.match(/^domain=(.+)$/i)?.[1]?.trim().toLowerCase())
    .find(Boolean);
  return {
    name,
    value: cookieValue,
    ...(domainAttribute ? { domain: domainAttribute.replace(/^\./, "") } : {})
  };
}

function isSameSiteCookieDomain(hostname: string, domain: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  const normalizedDomain = domain.toLowerCase().replace(/^\./, "");
  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
}

async function buildCompletedSource(input: {
  fetched: FetchedPublicUrl;
  id: string;
  url: string;
  fallbackTitle: string;
  readAt: string;
}): Promise<UrlSourceReference> {
  const { fetched, id, url, fallbackTitle, readAt } = input;
  const { response } = fetched;
  const contentType = responseContentType(response);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return failedSource({ id, url, title: fallbackTitle, readAt, code: "url_access_restricted" });
    }
    return failedSource({ id, url, title: fallbackTitle, readAt, code: "url_http_error" });
  }

  if (!supportedContentTypes.includes(contentType)) {
    return failedSource({ id, url, title: fallbackTitle, readAt, code: "url_unsupported_content_type" });
  }

  const isHtml = responseContentTypeLooksLikeHtml(contentType);
  const contentLength = Number(response.headers.get("Content-Length") ?? 0);
  if (!isHtml && contentLength > maxFetchedBytes) {
    return failedSource({ id, url, title: fallbackTitle, readAt, code: "url_response_too_large" });
  }

  let text: string;
  try {
    text = fetched.text ?? await readLimitedResponseText(response, { allowPartial: isHtml });
  } catch {
    return failedSource({ id, url, title: fallbackTitle, readAt, code: "url_response_too_large" });
  }

  const extracted = extractReadableText(text, contentType);
  if (!extracted.summary) {
    return failedSource({ id, url, title: fallbackTitle, readAt, code: "url_empty_content" });
  }
  if (isAccessRestrictedContent(extracted.title, extracted.summary, text)) {
    return failedSource({ id, url, title: extracted.title || fallbackTitle, readAt, code: "url_access_restricted" });
  }

  return {
    id,
    type: "url_input",
    title: extracted.title || fallbackTitle,
    summary: extracted.summary,
    url,
    fetchStatus: "completed",
    readAt,
    confirmedByUser: true
  };
}

function responseContentType(response: Response): string {
  return response.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function responseContentTypeLooksLikeHtml(contentType: string): boolean {
  return contentType === "text/html" || contentType === "application/xhtml+xml";
}

function extractMetaRefreshUrl(html: string, baseUrl: string): URL | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    if (!/http-equiv\s*=\s*["']?refresh["']?/iu.test(tag)) continue;
    const content = tag.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/iu)?.[2]
      ?? tag.match(/\bcontent\s*=\s*([^"'\s>][^>]*)/iu)?.[1]
      ?? "";
    const url = content.match(/(?:^|;)\s*url\s*=\s*([^;]+)/iu)?.[1]?.trim().replace(/^["']|["']$/g, "");
    if (!url) continue;
    try {
      return new URL(decodeHtml(url), baseUrl);
    } catch {
      return null;
    }
  }
  return null;
}

function extractCanonicalNavigationUrl(html: string, baseUrl: string): URL | null {
  const tags = [
    ...html.match(/<link\b[^>]*>/gi) ?? [],
    ...html.match(/<meta\b[^>]*>/gi) ?? []
  ];
  for (const tag of tags) {
    const href = readHtmlAttribute(tag, "href") ?? readHtmlAttribute(tag, "content");
    if (!href) continue;
    const rel = readHtmlAttribute(tag, "rel");
    const property = readHtmlAttribute(tag, "property");
    const name = readHtmlAttribute(tag, "name");
    const isCanonical = rel?.split(/\s+/).some((value) => value.toLowerCase() === "canonical")
      || property?.toLowerCase() === "og:url"
      || name?.toLowerCase() === "og:url";
    if (!isCanonical) continue;
    try {
      const resolved = new URL(decodeHtml(href), baseUrl);
      return resolved.toString() === new URL(baseUrl).toString() ? null : resolved;
    } catch {
      return null;
    }
  }
  return null;
}

function htmlBaseUrlForNavigation(html: string, requestUrl: string): string {
  const baseTag = html.match(/<base\b[^>]*>/i)?.[0];
  const href = baseTag ? readHtmlAttribute(baseTag, "href") : undefined;
  if (!href) return requestUrl;
  try {
    return new URL(decodeHtml(href), requestUrl).toString();
  } catch {
    return requestUrl;
  }
}

function readHtmlAttribute(tag: string, name: string): string | undefined {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quoted = tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*(['"])([\\s\\S]*?)\\1`, "iu"))?.[2];
  if (quoted !== undefined) return quoted.trim();
  return tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*([^\\s>]+)`, "iu"))?.[1]?.trim();
}

async function readLimitedResponseText(
  response: Response,
  options: { allowPartial?: boolean } = {}
): Promise<string> {
  const allowPartial = options.allowPartial ?? false;
  if (!response.body) {
    const text = await response.text();
    const bytes = new TextEncoder().encode(text);
    if (bytes.byteLength <= maxFetchedBytes) return text;
    if (!allowPartial) throw new Error("response too large");
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, maxFetchedBytes));
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maxFetchedBytes - received;
      if (value.byteLength > remaining) {
        if (!allowPartial) throw new Error("response too large");
        if (remaining > 0) {
          chunks.push(value.slice(0, remaining));
          received += remaining;
        }
        await reader.cancel().catch(() => undefined);
        break;
      }
      chunks.push(value);
      received += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function extractReadableText(text: string, contentType: string): { title?: string; summary: string } {
  if (contentType === "text/html" || contentType === "application/xhtml+xml") {
    const title = extractHtmlTitle(text);
    const preferredContent = extractPreferredHtmlContent(text);
    const withoutNoise = (preferredContent ?? text)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
    return {
      ...(title ? { title } : {}),
      summary: summarizeFetchedText(decodeHtml(stripTags(withoutNoise)))
    };
  }

  return { summary: summarizeFetchedText(text) };
}

function extractHtmlTitle(html: string): string | undefined {
  const activityTitle = extractElementHtmlById(html, "activity-name");
  const metaTitle = readMetaContent(html, ["og:title", "twitter:title"]);
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = [activityTitle, metaTitle, titleTag]
    .map((value) => decodeHtml(stripTags(value ?? "")).trim())
    .find(Boolean);
  return title || undefined;
}

function readMetaContent(html: string, names: string[]): string | undefined {
  const normalizedNames = new Set(names.map((name) => name.toLowerCase()));
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const property = readHtmlAttribute(tag, "property")?.toLowerCase();
    const name = readHtmlAttribute(tag, "name")?.toLowerCase();
    if (!property && !name) continue;
    if (!normalizedNames.has(property ?? "") && !normalizedNames.has(name ?? "")) continue;
    const content = readHtmlAttribute(tag, "content");
    if (content) return content;
  }
  return undefined;
}

function extractPreferredHtmlContent(html: string): string | null {
  return extractElementHtmlById(html, "js_content")
    ?? extractWechatContentNoencode(html)
    ?? extractFirstHtmlElement(html, ["article", "main"]);
}

function extractWechatContentNoencode(html: string): string | null {
  const encoded = html.match(/\bcontent_noencode\s*:\s*'((?:\\.|[^'\\])*)'/)?.[1];
  return encoded ? decodeJavaScriptString(encoded) : null;
}

function decodeJavaScriptString(value: string): string {
  return value
    .replace(/\\x([0-9a-f]{2})/giu, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\u([0-9a-f]{4})/giu, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\//g, "/")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, "\"")
    .replace(/\\\\/g, "\\");
}

function extractFirstHtmlElement(html: string, tagNames: string[]): string | null {
  for (const tagName of tagNames) {
    const openTag = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>`, "iu").exec(html);
    if (!openTag) continue;
    return extractHtmlElementAt(html, openTag.index, tagName);
  }
  return null;
}

function extractElementHtmlById(html: string, id: string): string | null {
  const openTagPattern = /<([a-z][\w:-]*)\b[^>]*>/giu;
  let match: RegExpExecArray | null;
  while ((match = openTagPattern.exec(html))) {
    const tag = match[0];
    if (readHtmlAttribute(tag, "id") !== id) continue;
    return extractHtmlElementAt(html, match.index, match[1]);
  }
  return null;
}

function extractHtmlElementAt(html: string, openTagStart: number, tagName: string): string {
  const openTagEnd = html.indexOf(">", openTagStart);
  if (openTagEnd === -1) return html.slice(openTagStart);
  const tagPattern = new RegExp(`<\\/?${escapeRegExp(tagName)}\\b[^>]*>`, "giu");
  tagPattern.lastIndex = openTagEnd + 1;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(html))) {
    const tag = match[0];
    if (tag.startsWith("</")) {
      depth -= 1;
    } else if (!tag.endsWith("/>")) {
      depth += 1;
    }
    if (depth === 0) {
      return html.slice(openTagStart, match.index + tag.length);
    }
  }
  return html.slice(openTagStart);
}

function summarizeFetchedText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxSummaryCharacters);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}

function isAccessRestrictedContent(title: string | undefined, summary: string, rawText = ""): boolean {
  const content = `${title ?? ""} ${summary} ${rawText}`;
  return [
    /访问环境异常/u,
    /环境异常/u,
    /请在微信客户端打开/u,
    /请使用微信扫描/u,
    /长按识别二维码/u,
    /该内容无法访问/u,
    /链接已过期/u,
    /内容被发布者删除/u,
    /enable javascript/i,
    /zh-zse-ck/i,
    /zse_ck/i,
    /verify you are human/i,
    /captcha/i,
    /access denied/i,
    /forbidden/i,
    /sign in to continue/i,
    /log in to continue/i
  ].some((pattern) => pattern.test(content));
}

function failedSource(input: {
  id: string;
  url: string;
  title: string;
  readAt: string;
  code: FetchErrorCode;
}): UrlSourceReference {
  return {
    id: input.id,
    type: "url_input",
    title: input.title,
    summary: failedSourceSummary(input.code),
    url: input.url,
    fetchStatus: "failed",
    fetchErrorCode: input.code,
    readAt: input.readAt,
    confirmedByUser: true
  };
}

function failedSourceSummary(code: FetchErrorCode): string {
  if (code === "url_access_restricted") {
    return "URL 内容未能读取：站点拒绝服务端读取、需要登录/验证，或只允许特定客户端访问。本次议事不会使用该页面正文作为上下文。";
  }
  return "URL 内容未能读取。本次议事已继续，但不会使用该页面正文作为上下文。";
}

function normalizeExtractedUrl(value: string): string | null {
  const trimmed = value.replace(/[),.;!?，。！？；、]+$/u, "");
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isPublicHttpUrl(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname === "0.0.0.0"
    || hostname === "::1"
    || hostname === "[::1]"
  ) {
    return false;
  }

  const ipv4 = parseIpv4(hostname);
  if (!ipv4) {
    const ipv6 = hostname.replace(/^\[/, "").replace(/\]$/, "");
    return !(
      ipv6 === "::1"
      || ipv6.startsWith("fc")
      || ipv6.startsWith("fd")
      || ipv6.startsWith("fe80:")
    );
  }
  const [a, b] = ipv4;
  return !(
    a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
  );
}

class UrlFetchError extends Error {
  constructor(readonly code: FetchErrorCode) {
    super(code);
  }
}

function parseIpv4(hostname: string): [number, number, number, number] | null {
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return numbers as [number, number, number, number];
}
