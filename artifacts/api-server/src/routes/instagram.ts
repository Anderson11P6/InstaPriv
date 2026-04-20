import { Router } from "express";
import { exec } from "child_process";
import { promisify } from "util";

const router = Router();
const execAsync = promisify(exec);

let cachedCsrf: string | null = null;
let csrfExpiry = 0;

async function getCsrfToken(): Promise<string> {
  const now = Date.now();
  if (cachedCsrf && now < csrfExpiry) return cachedCsrf;

  try {
    const { stdout } = await execAsync(
      `curl -s -c /tmp/ig_cookies.txt "https://www.instagram.com/" \
        -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" \
        -H "Accept: text/html" \
        --max-time 8`,
      { timeout: 10000 }
    );

    const m = stdout.match(/"csrf_token":"([^"]+)"/);
    if (m?.[1]) {
      cachedCsrf = m[1];
      csrfExpiry = now + 1000 * 60 * 20;
      return m[1];
    }

    const { stdout: cookieOut } = await execAsync(
      "grep csrftoken /tmp/ig_cookies.txt | awk '{print $7}' | head -1",
      { timeout: 3000 }
    );

    const csrf = cookieOut.trim();
    if (csrf) {
      cachedCsrf = csrf;
      csrfExpiry = now + 1000 * 60 * 20;
    }
    return csrf;
  } catch {
    return "";
  }
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

  const sessionId = process.env["INSTAGRAM_SESSION_ID"];
  const dsUserId = process.env["INSTAGRAM_DS_USER_ID"] ?? sessionId?.split(":")[0] ?? "";

  if (!sessionId) {
    res.status(503).json({ error: "Sessão do Instagram não configurada." });
    return;
  }

  try {
    const csrfToken = await getCsrfToken();

    const cookie = [
      `sessionid=${sessionId}`,
      csrfToken ? `csrftoken=${csrfToken}` : "",
      dsUserId ? `ds_user_id=${dsUserId}` : "",
    ].filter(Boolean).join("; ");

    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;

    const curlCmd = [
      "curl -s -L",
      `--max-time 12`,
      `--connect-timeout 8`,
      `-H "Cookie: ${cookie}"`,
      `-H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"`,
      `-H "Accept: */*"`,
      `-H "Accept-Language: pt-BR,pt;q=0.9,en;q=0.8"`,
      `-H "x-ig-app-id: 936619743392459"`,
      csrfToken ? `-H "x-csrftoken: ${csrfToken}"` : "",
      `-H "X-Requested-With: XMLHttpRequest"`,
      `-H "Referer: https://www.instagram.com/${username}/"`,
      `-H "Origin: https://www.instagram.com"`,
      `-w "\\nHTTP_STATUS:%{http_code}"`,
      `"${url}"`,
    ].filter(Boolean).join(" ");

    const { stdout } = await execAsync(curlCmd, { timeout: 15000 });

    const statusMatch = stdout.match(/\nHTTP_STATUS:(\d+)$/);
    const httpStatus = statusMatch ? parseInt(statusMatch[1]) : 0;
    const body = stdout.replace(/\nHTTP_STATUS:\d+$/, "").trim();

    if (httpStatus === 404) {
      res.json({ status: "not-found", username });
      return;
    }

    if (httpStatus === 401 || httpStatus === 403) {
      cachedCsrf = null;
      res.status(401).json({ error: "Sessão expirada. Atualize o cookie sessionid." });
      return;
    }

    if (httpStatus !== 200 || !body) {
      req.log.warn({ httpStatus, username }, "Instagram check non-200");
      res.json({ status: "rate-limited", username });
      return;
    }

    let data: {
      data?: {
        user?: {
          is_private?: boolean;
          full_name?: string;
          profile_pic_url?: string;
        } | null;
      };
    };

    try {
      data = JSON.parse(body);
    } catch {
      req.log.warn({ username, bodySnippet: body.slice(0, 100) }, "Failed to parse Instagram response");
      res.json({ status: "rate-limited", username });
      return;
    }

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
    req.log.error({ err, username }, "Error checking Instagram account");
    res.status(500).json({ error: "Erro interno ao verificar a conta." });
  }
});

export default router;
