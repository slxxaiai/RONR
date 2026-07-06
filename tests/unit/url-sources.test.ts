import { describe, expect, test, vi } from "vitest";
import { buildUrlSourceReferences, extractHttpUrls, stripExtractedUrls } from "@ronr/web/server/url-sources";

describe("URL source extraction", () => {
  test("extracts unique http and https URLs, strips trailing punctuation, removes hash, and caps at five", () => {
    expect(extractHttpUrls([
      "参考 https://example.com/a,",
      "重复 https://example.com/a#section。",
      "第二个 http://example.org/path?x=1!",
      "第三个 https://one.test",
      "第四个 https://two.test",
      "第五个 https://three.test",
      "第六个 https://four.test",
      "非法 ftp://example.com/file"
    ].join(" "))).toEqual([
      "https://example.com/a",
      "http://example.org/path?x=1",
      "https://one.test/",
      "https://two.test/",
      "https://three.test/"
    ]);
  });

  test("stops URL extraction at CJK punctuation before continued question text", () => {
    expect(extractHttpUrls(
      "参考https://mp.weixin.qq.com/s/F3KD4cEmwisijZcbyRYAIw，目前智谱股票是否值得加仓"
    )).toEqual(["https://mp.weixin.qq.com/s/F3KD4cEmwisijZcbyRYAIw"]);
  });

  test("strips extracted URLs from question text for context sufficiency checks", () => {
    expect(stripExtractedUrls("请分析 https://example.com/a。 还要考虑预算。")).toBe("请分析 还要考虑预算。");
    expect(stripExtractedUrls(
      "参考https://mp.weixin.qq.com/s/F3KD4cEmwisijZcbyRYAIw，目前智谱股票是否值得加仓"
    )).toBe("参考 目前智谱股票是否值得加仓");
    expect(stripExtractedUrls("https://example.com/a\nhttps://example.com/b")).toBe("");
  });

  test("marks localhost and private addresses as failed without fetching", async () => {
    const fetchMock = vi.fn();

    const result = await buildUrlSourceReferences(
      "看这些 URL：http://localhost:3000/a https://127.0.0.1/b https://192.168.1.2/c https://[::1]/d",
      fetchMock
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.sourceReferences).toHaveLength(4);
    expect(result.sourceReferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "url_input", fetchStatus: "failed", fetchErrorCode: "url_private_address" })
      ])
    );
  });
});

describe("URL source fetching", () => {
  test("fetches HTML, removes noisy tags, and summarizes readable text", async () => {
    const fetchMock = vi.fn(async () => new Response(
      `
        <html>
          <head><title>Policy Page</title><style>.x{}</style></head>
          <body>
            <nav>ignore nav</nav>
            <main><h1>购房政策</h1><p>资格要求需要复核。</p></main>
            <script>ignore script</script>
          </body>
        </html>
      `,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    ));

    const result = await buildUrlSourceReferences("请参考 https://example.com/policy", fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/policy",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: expect.stringContaining("application/xhtml+xml"),
          "Accept-Language": expect.stringContaining("zh-CN"),
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Upgrade-Insecure-Requests": "1",
          "User-Agent": expect.stringContaining("Chrome/")
        }),
        redirect: "manual"
      })
    );
    expect(result.sourceReferences).toEqual([
      expect.objectContaining({
        id: "source-url-1",
        type: "url_input",
        title: "Policy Page",
        summary: expect.stringContaining("资格要求需要复核"),
        url: "https://example.com/policy",
        fetchStatus: "completed"
      })
    ]);
    expect(result.sourceReferences[0].summary).not.toContain("ignore nav");
    expect(result.sourceReferences[0].summary).not.toContain("ignore script");
  });

  test("uses the session locale as browser Accept-Language preference", async () => {
    const fetchMock = vi.fn(async () => new Response("English source text", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    }));

    await buildUrlSourceReferences("Read https://example.com/en", fetchMock, "en");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/en",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Accept-Language": expect.stringMatching(/^en-US,en;q=0\.9/)
        })
      })
    );
  });

  test("uses Japanese and Korean locale preferences in browser headers", async () => {
    const fetchMock = vi.fn(async () => new Response("localized source", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    }));

    await buildUrlSourceReferences("読んで https://example.com/ja", fetchMock, "ja");
    await buildUrlSourceReferences("읽기 https://example.com/ko", fetchMock, "ko");

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      "Accept-Language": expect.stringMatching(/^ja-JP,ja;q=0\.9/)
    });
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
      "Accept-Language": expect.stringMatching(/^ko-KR,ko;q=0\.9/)
    });
  });

  test("marks access-restricted HTML as failed instead of usable context", async () => {
    const fetchMock = vi.fn(async () => new Response(
      "<html><head><title>访问环境异常</title></head><body>请在微信客户端打开链接后继续访问。</body></html>",
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    ));

    const result = await buildUrlSourceReferences("https://mp.weixin.qq.com/s/example", fetchMock);

    expect(result.sourceReferences).toEqual([
      expect.objectContaining({
        type: "url_input",
        fetchStatus: "failed",
        fetchErrorCode: "url_access_restricted"
      })
    ]);
  });

  test("marks 401 and 403 pages as access-restricted without using their body as context", async () => {
    const fetchMock = vi.fn(async () => new Response(
      "<html><body>Forbidden</body></html>",
      { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
    ));

    const result = await buildUrlSourceReferences("https://zhuanlan.zhihu.com/p/359677510", fetchMock);

    expect(result.sourceReferences).toEqual([
      expect.objectContaining({
        type: "url_input",
        title: "zhuanlan.zhihu.com",
        fetchStatus: "failed",
        fetchErrorCode: "url_access_restricted",
        summary: expect.stringContaining("站点拒绝服务端读取")
      })
    ]);
  });

  test("marks Zhihu verification shell HTML as access-restricted even when status is ok", async () => {
    const fetchMock = vi.fn(async () => new Response(
      `
        <!DOCTYPE html>
        <html>
          <head><meta id="zh-zse-ck" charset="UTF-8" content="mock"></head>
          <body>
            <div>知乎，让每一次点击都充满意义</div>
            <script src="https://static.zhihu.com/zse-ck/v4/mock.js"></script>
          </body>
        </html>
      `,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    ));

    const result = await buildUrlSourceReferences("https://zhuanlan.zhihu.com/p/359677510", fetchMock);

    expect(result.sourceReferences).toEqual([
      expect.objectContaining({
        type: "url_input",
        fetchStatus: "failed",
        fetchErrorCode: "url_access_restricted"
      })
    ]);
  });

  test("extracts readable WeChat article content from js_content instead of page chrome", async () => {
    const fetchMock = vi.fn(async () => new Response(
      `
        <html>
          <head>
            <title>微信公众平台</title>
            <meta property="og:title" content="大模型估值大反转" />
          </head>
          <body>
            <script>
              var msg = {
                title: '大模型估值大反转',
                content_noencode: '\\x3cp\\x3e1月8日，智谱在港交所挂牌，发行价116.2港元。第二天，MiniMax跟着上市。\\x3c/p\\x3e'
              };
            </script>
            <h1 class="rich_media_title" id="activity-name"><span class="js_title_inner">大模型估值大反转</span></h1>
            <div id="js_content"><p>1月8日，智谱在港交所挂牌，发行价116.2港元。第二天，MiniMax跟着上市。</p></div>
            <footer>ignore footer chrome</footer>
          </body>
        </html>
      `,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    ));

    const result = await buildUrlSourceReferences("读 https://mp.weixin.qq.com/s/F3KD4cEmwisijZcbyRYAIw", fetchMock);

    expect(result.sourceReferences).toEqual([
      expect.objectContaining({
        title: "大模型估值大反转",
        fetchStatus: "completed",
        summary: expect.stringContaining("1月8日，智谱在港交所挂牌")
      })
    ]);
    expect(result.sourceReferences[0].summary).toContain("MiniMax");
    expect(result.sourceReferences[0].summary).not.toContain("ignore footer chrome");
  });

  test("uses the first 512KB of oversized HTML when article text is available early", async () => {
    const earlyArticle = [
      "<html><head><meta property=\"og:title\" content=\"Large WeChat Article\"></head><body>",
      "<div id=\"js_content\"><p>正文在前段，可以直接抽取。</p></div>",
      "x".repeat(512 * 1024 + 128),
      "</body></html>"
    ].join("");
    const fetchMock = vi.fn(async () => new Response(earlyArticle, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": String(new TextEncoder().encode(earlyArticle).byteLength)
      }
    }));

    const result = await buildUrlSourceReferences("读 https://mp.weixin.qq.com/s/large", fetchMock);

    expect(result.sourceReferences).toEqual([
      expect.objectContaining({
        title: "Large WeChat Article",
        fetchStatus: "completed",
        summary: expect.stringContaining("正文在前段，可以直接抽取")
      })
    ]);
  });

  test("uses same-origin navigation headers after a public redirect", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://example.com/start") {
        return new Response("", {
          status: 302,
          headers: { Location: "/article" }
        });
      }
      return new Response("redirected article body", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    });

    const result = await buildUrlSourceReferences("读 https://example.com/start", fetchMock);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com/article",
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: "https://example.com/start",
          "Sec-Fetch-Site": "same-origin"
        })
      })
    );
    expect(result.sourceReferences).toEqual([
      expect.objectContaining({ fetchStatus: "completed", summary: "redirected article body" })
    ]);
  });

  test("replays temporary first-party cookies across same-site redirects only", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://example.com/start") {
        return new Response("", {
          status: 302,
          headers: {
            Location: "/article",
            "Set-Cookie": "session=temporary; Path=/; HttpOnly"
          }
        });
      }
      return new Response("cookie gated article body", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    });

    const result = await buildUrlSourceReferences("读 https://example.com/start", fetchMock);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://example.com/start",
      expect.objectContaining({
        headers: expect.not.objectContaining({ Cookie: expect.any(String) })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com/article",
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: "session=temporary" })
      })
    );
    expect(result.sourceReferences).toEqual([
      expect.objectContaining({ fetchStatus: "completed", summary: "cookie gated article body" })
    ]);
  });

  test("does not replay temporary cookies to a different redirect host", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://example.com/start") {
        return new Response("", {
          status: 302,
          headers: {
            Location: "https://other.example/article",
            "Set-Cookie": "session=temporary; Path=/; HttpOnly"
          }
        });
      }
      return new Response("cross host article body", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    });

    await buildUrlSourceReferences("读 https://example.com/start", fetchMock);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://other.example/article",
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: "https://example.com/start",
          "Sec-Fetch-Site": "cross-site"
        })
      })
    );
    expect(fetchMock.mock.calls[1]?.[1]?.headers).not.toMatchObject({ Cookie: expect.any(String) });
  });

  test("follows safe HTML meta refresh navigation like a browser", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://example.com/start") {
        return new Response(
          "<html><head><meta http-equiv=\"refresh\" content=\"0; url=/article\"></head><body>redirecting</body></html>",
          { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
      return new Response("<html><head><title>Article</title></head><body>Meta refresh article body.</body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    });

    const result = await buildUrlSourceReferences("读 https://example.com/start", fetchMock);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com/article",
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: "https://example.com/start",
          "Sec-Fetch-Site": "same-origin"
        })
      })
    );
    expect(result.sourceReferences).toEqual([
      expect.objectContaining({
        title: "Article",
        fetchStatus: "completed",
        summary: expect.stringContaining("Meta refresh article body")
      })
    ]);
  });

  test("continues normal HTTP redirect handling after a meta refresh navigation", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://example.com/start") {
        return new Response(
          "<meta http-equiv=\"refresh\" content=\"0; url=/intermediate\">",
          { status: 200, headers: { "Content-Type": "text/html" } }
        );
      }
      if (url === "https://example.com/intermediate") {
        return new Response("", {
          status: 302,
          headers: { Location: "/article" }
        });
      }
      return new Response("final article body", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    });

    const result = await buildUrlSourceReferences("读 https://example.com/start", fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://example.com/article",
      expect.objectContaining({
        headers: expect.objectContaining({ Referer: "https://example.com/intermediate" })
      })
    );
    expect(result.sourceReferences).toEqual([
      expect.objectContaining({ fetchStatus: "completed", summary: "final article body" })
    ]);
  });

  test("rejects meta refresh navigation to private addresses", async () => {
    const fetchMock = vi.fn(async () => new Response(
      "<meta http-equiv=\"refresh\" content=\"0; url=http://127.0.0.1/admin\">",
      { status: 200, headers: { "Content-Type": "text/html" } }
    ));

    const result = await buildUrlSourceReferences("读 https://example.com/start", fetchMock);

    expect(result.sourceReferences).toEqual([
      expect.objectContaining({ fetchStatus: "failed", fetchErrorCode: "url_redirect_private_address" })
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("stops meta refresh loops at the redirect limit", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const current = new URL(url);
      const count = Number(current.searchParams.get("n") ?? "0");
      return new Response(
        `<meta http-equiv="refresh" content="0; url=/loop?n=${count + 1}">`,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    });

    const result = await buildUrlSourceReferences("读 https://example.com/loop?n=0", fetchMock);

    expect(result.sourceReferences).toEqual([
      expect.objectContaining({ fetchStatus: "failed", fetchErrorCode: "url_redirect_limit" })
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test("follows same-origin canonical links to a fuller article page", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://example.com/mobile/article") {
        return new Response(
          "<html><head><link rel=\"canonical\" href=\"/article\"></head><body>thin mobile shell</body></html>",
          { status: 200, headers: { "Content-Type": "text/html" } }
        );
      }
      return new Response("<html><head><title>Canonical Article</title></head><body>Full canonical article body.</body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" }
      });
    });

    const result = await buildUrlSourceReferences("读 https://example.com/mobile/article", fetchMock);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com/article",
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: "https://example.com/mobile/article",
          "Sec-Fetch-Site": "same-origin"
        })
      })
    );
    expect(result.sourceReferences).toEqual([
      expect.objectContaining({
        title: "Canonical Article",
        fetchStatus: "completed",
        summary: expect.stringContaining("Full canonical article body")
      })
    ]);
  });

  test("follows same-origin og:url entries when canonical is absent", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://example.com/share-card") {
        return new Response(
          "<html><head><meta property=\"og:url\" content=\"https://example.com/article\"></head><body>share card</body></html>",
          { status: 200, headers: { "Content-Type": "text/html" } }
        );
      }
      return new Response("Open graph article body", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    });

    const result = await buildUrlSourceReferences("读 https://example.com/share-card", fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.sourceReferences).toEqual([
      expect.objectContaining({ fetchStatus: "completed", summary: "Open graph article body" })
    ]);
  });

  test("does not follow cross-origin canonical links automatically", async () => {
    const fetchMock = vi.fn(async () => new Response(
      "<html><head><link rel=\"canonical\" href=\"https://other.example/article\"></head><body>Original page body.</body></html>",
      { status: 200, headers: { "Content-Type": "text/html" } }
    ));

    const result = await buildUrlSourceReferences("读 https://example.com/article", fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.sourceReferences).toEqual([
      expect.objectContaining({
        fetchStatus: "completed",
        summary: expect.stringContaining("Original page body")
      })
    ]);
  });

  test("rejects private same-origin-looking canonical targets after URL parsing", async () => {
    const fetchMock = vi.fn(async () => new Response(
      "<html><head><link rel=\"canonical\" href=\"http://127.0.0.1/admin\"></head><body>shell</body></html>",
      { status: 200, headers: { "Content-Type": "text/html" } }
    ));

    const result = await buildUrlSourceReferences("读 https://example.com/article", fetchMock);

    expect(result.sourceReferences).toEqual([
      expect.objectContaining({ fetchStatus: "failed", fetchErrorCode: "url_redirect_private_address" })
    ]);
  });

  test("stops canonical navigation loops at the redirect limit", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const current = new URL(url);
      const count = Number(current.searchParams.get("n") ?? "0");
      return new Response(
        `<link rel="canonical" href="/canonical-loop?n=${count + 1}"><body>loop</body>`,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    });

    const result = await buildUrlSourceReferences("读 https://example.com/canonical-loop?n=0", fetchMock);

    expect(result.sourceReferences).toEqual([
      expect.objectContaining({ fetchStatus: "failed", fetchErrorCode: "url_redirect_limit" })
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test("accepts xhtml pages from sites that use browser navigation content negotiation", async () => {
    const fetchMock = vi.fn(async () => new Response(
      "<html><head><title>XHTML Page</title></head><body><main>可读取的 XHTML 正文。</main></body></html>",
      { status: 200, headers: { "Content-Type": "application/xhtml+xml; charset=utf-8" } }
    ));

    const result = await buildUrlSourceReferences("读 https://example.com/xhtml", fetchMock);

    expect(result.sourceReferences).toEqual([
      expect.objectContaining({
        title: "XHTML Page",
        fetchStatus: "completed",
        summary: expect.stringContaining("可读取的 XHTML 正文")
      })
    ]);
  });

  test("fetches plain text and JSON sources", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://example.com/plain") {
        return new Response("plain source text", { status: 200, headers: { "Content-Type": "text/plain" } });
      }
      return new Response(JSON.stringify({ summary: "json source text" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });

    const result = await buildUrlSourceReferences(
      "读 https://example.com/plain 和 https://example.com/data.json",
      fetchMock
    );

    expect(result.sourceReferences).toEqual([
      expect.objectContaining({ fetchStatus: "completed", summary: "plain source text" }),
      expect.objectContaining({ fetchStatus: "completed", summary: "{\"summary\":\"json source text\"}" })
    ]);
  });

  test("marks unsupported content types, oversized responses, and network failures without throwing", async () => {
    const oversizedBody = "x".repeat(512 * 1024 + 1);
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://example.com/image") {
        return new Response("png", { status: 200, headers: { "Content-Type": "image/png" } });
      }
      if (url === "https://example.com/large") {
        return new Response(oversizedBody, { status: 200, headers: { "Content-Type": "text/plain" } });
      }
      throw new Error("network down");
    });

    const result = await buildUrlSourceReferences(
      "读 https://example.com/image https://example.com/large https://example.com/down",
      fetchMock
    );

    expect(result.sourceReferences).toEqual([
      expect.objectContaining({ fetchStatus: "failed", fetchErrorCode: "url_unsupported_content_type" }),
      expect.objectContaining({ fetchStatus: "failed", fetchErrorCode: "url_response_too_large" }),
      expect.objectContaining({ fetchStatus: "failed", fetchErrorCode: "url_fetch_failed" })
    ]);
  });

  test("rejects redirects to private addresses", async () => {
    const fetchMock = vi.fn(async () => new Response("", {
      status: 302,
      headers: { Location: "http://127.0.0.1/admin" }
    }));

    const result = await buildUrlSourceReferences("读 https://example.com/redirect", fetchMock);

    expect(result.sourceReferences).toEqual([
      expect.objectContaining({ fetchStatus: "failed", fetchErrorCode: "url_redirect_private_address" })
    ]);
  });
});
