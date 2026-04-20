import { Router } from "express";

const router = Router();

let cachedCookies: string | null = null;
let cookieExpiry = 0;

async function getInstagramCookies(): Promise<string> {
  const now = Date.now();
  if (cachedCookies && now < cookieExpiry) {
    return cachedCookies;
  }

  const res = await fetch("https://www.instagram.com/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });

  const setCookieHeader = res.headers.getSetCookie?.() ?? [];
  const cookies = setCookieHeader
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");

  cachedCookies = cookies;
  cookieExpiry = now + 1000 * 60 * 30;
  return cookies;
}

router.get("/instagram/check", async (req, res) => {
  const username = (req.query["username"] as string | undefined)?.trim().replace(/^@/, "").toLowerCase();

  if (!username) {
    res.status(400).json({ error: "username é obrigatório" });
    return;
  }

  if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) {
    res.status(400).json({ error: "Nome de usuário inválido" });
    return;
  }

  try {
    const cookies = await getInstagramCookies();
    const csrfMatch = cookies.match(/csrftoken=([^;]+)/);
    const csrfToken = csrfMatch?.[1] ?? "";

    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "x-ig-app-id": "936619743392459",
        "x-csrftoken": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": `https://www.instagram.com/${username}/`,
        "Origin": "https://www.instagram.com",
        "Cookie": cookies,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 404) {
      res.json({ status: "not-found", username });
      return;
    }

    if (response.status === 401 || response.status === 403) {
      cachedCookies = null;
      req.log.warn({ status: response.status, username }, "Instagram API unauthorized, clearing cookie cache");
      res.json({ status: "rate-limited", username });
      return;
    }

    if (!response.ok) {
      req.log.warn({ status: response.status, username }, "Instagram API non-OK");
      res.json({ status: "rate-limited", username });
      return;
    }

    const data = await response.json() as {
      data?: {
        user?: {
          is_private?: boolean;
          full_name?: string;
          profile_pic_url?: string;
          username?: string;
          biography?: string;
          follower_count?: number;
        } | null;
      };
    };

    const user = data?.data?.user;

    if (!user) {
      res.json({ status: "not-found", username });
      return;
    }

    res.json({
      status: user.is_private ? "private" : "public",
      username,
      displayName: user.full_name || username,
      profilePic: user.profile_pic_url || null,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TimeoutError") {
      req.log.warn({ username }, "Instagram request timed out");
      res.status(504).json({ error: "Tempo esgotado. Tente novamente." });
      return;
    }
    req.log.error({ err, username }, "Error checking Instagram account");
    res.status(500).json({ error: "Erro interno ao verificar a conta." });
  }
});

export default router;
