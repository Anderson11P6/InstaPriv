import { useState, useRef } from "react";

type CheckStatus = "idle" | "loading" | "public" | "private" | "not-found" | "rate-limited" | "error";

interface CheckResult {
  username: string;
  status: CheckStatus;
  displayName?: string;
  profilePic?: string;
  followers?: number | null;
  following?: number | null;
  posts?: number | null;
  isVerified?: boolean;
  biography?: string | null;
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function UserXIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="17" y1="8" x2="23" y2="14"/>
      <line x1="23" y1="8" x2="17" y2="14"/>
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

function VerifiedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.293 14.707l-3.414-3.414 1.414-1.414 2 2 4.586-4.586 1.414 1.414-6 6z"/>
    </svg>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString("pt-BR");
}

async function checkInstagramAccount(username: string): Promise<CheckResult> {
  const cleanUsername = username.replace(/^@/, "").trim().toLowerCase();

  if (!cleanUsername) {
    throw new Error("Por favor, insira um nome de usuário.");
  }

  if (!/^[a-zA-Z0-9._]{1,30}$/.test(cleanUsername)) {
    throw new Error("Nome de usuário inválido. Use apenas letras, números, pontos e underscores.");
  }

  const response = await fetch(
    `/api/instagram/check?username=${encodeURIComponent(cleanUsername)}`,
    { signal: AbortSignal.timeout(20000) }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body?.error ?? "Erro ao verificar a conta. Tente novamente.");
  }

  const data = await response.json() as {
    status: CheckStatus;
    username: string;
    displayName?: string;
    profilePic?: string;
    followers?: number | null;
    following?: number | null;
    posts?: number | null;
    isVerified?: boolean;
    biography?: string | null;
  };

  return {
    username: cleanUsername,
    status: data.status,
    displayName: data.displayName,
    profilePic: data.profilePic,
    followers: data.followers,
    following: data.following,
    posts: data.posts,
    isVerified: data.isVerified,
    biography: data.biography,
  };
}

function StatBox({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-bold text-gray-900 text-base leading-tight">
        {value != null ? formatCount(value) : "—"}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function ProfileCard({ result, accent }: { result: CheckResult; accent: "emerald" | "amber" }) {
  const colors = {
    emerald: {
      headerBg: "bg-emerald-50",
      border: "border-emerald-100",
      divider: "border-emerald-100",
      badge: "bg-emerald-100 text-emerald-700",
      dot: "bg-emerald-500",
      icon: "bg-emerald-500",
      title: "text-emerald-800",
      sub: "text-emerald-600",
      statBorder: "border-emerald-100",
    },
    amber: {
      headerBg: "bg-amber-50",
      border: "border-amber-100",
      divider: "border-amber-100",
      badge: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
      icon: "bg-amber-500",
      title: "text-amber-800",
      sub: "text-amber-600",
      statBorder: "border-amber-100",
    },
  }[accent];

  const isPublic = accent === "emerald";

  return (
    <div className={`bg-white rounded-2xl shadow-md border ${colors.border} overflow-hidden`}>
      <div className={`${colors.headerBg} px-5 py-4 flex items-center gap-3 border-b ${colors.divider}`}>
        <div className={`w-9 h-9 rounded-full ${colors.icon} flex items-center justify-center shadow-sm flex-shrink-0`}>
          {isPublic ? <GlobeIcon className="w-4 h-4 text-white" /> : <LockIcon className="w-4 h-4 text-white" />}
        </div>
        <div>
          <p className={`font-bold ${colors.title} text-sm`}>
            {isPublic ? "Conta Pública" : "Conta Privada"}
          </p>
          <p className={`${colors.sub} text-xs`}>
            {isPublic ? "Qualquer pessoa pode ver o perfil" : "Somente seguidores aprovados podem ver"}
          </p>
        </div>
        <div className="ml-auto">
          <span className={`inline-flex items-center gap-1.5 ${colors.badge} text-xs font-semibold px-3 py-1 rounded-full`}>
            {isPublic
              ? <><span className={`w-1.5 h-1.5 rounded-full ${colors.dot} inline-block`}></span>PÚBLICA</>
              : <><LockIcon className="w-2.5 h-2.5" />PRIVADA</>
            }
          </span>
        </div>
      </div>

      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-4">
          {result.profilePic ? (
            <img
              src={result.profilePic}
              alt={result.username}
              className={`w-16 h-16 rounded-full object-cover border-2 ${colors.border} flex-shrink-0`}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
                if (img.nextElementSibling) (img.nextElementSibling as HTMLElement).style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="w-16 h-16 rounded-full instagram-gradient flex items-center justify-center flex-shrink-0"
            style={{ display: result.profilePic ? "none" : "flex" }}
          >
            <span className="text-white font-bold text-2xl uppercase">{result.username[0]}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {result.displayName && result.displayName !== result.username && (
                <p className="font-bold text-gray-900 text-base truncate">{result.displayName}</p>
              )}
              {result.isVerified && (
                <VerifiedIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-gray-500 text-sm">@{result.username}</p>
            <a
              href={`https://instagram.com/${result.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 mt-1 transition-colors font-medium"
            >
              Ver no Instagram
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
            </a>
          </div>
        </div>

        {result.biography && (
          <p className="mt-3 text-xs text-gray-600 leading-relaxed line-clamp-3 border-t border-gray-100 pt-3">
            {result.biography}
          </p>
        )}

        {(result.followers != null || result.following != null || result.posts != null) && (
          <div className={`mt-4 pt-4 border-t ${colors.statBorder} grid grid-cols-3 gap-2 text-center`}>
            <StatBox label="Publicações" value={result.posts} />
            <StatBox label="Seguidores" value={result.followers} />
            <StatBox label="Seguindo" value={result.following} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [status, setStatus] = useState<CheckStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCheck = async () => {
    const username = inputValue.replace(/^@/, "").trim();

    if (!username) {
      setErrorMsg("Digite um nome de usuário para verificar.");
      return;
    }

    setErrorMsg("");
    setStatus("loading");
    setResult(null);

    try {
      const res = await checkInstagramAccount(username);
      setResult(res);
      setStatus(res.status);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCheck();
  };

  const handleReset = () => {
    setInputValue("");
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl instagram-gradient mb-4 shadow-lg">
            <InstagramIcon className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verificador de Conta
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Descubra se qualquer conta do Instagram<br />
            é pública ou privada — só pelo @
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nome de usuário do Instagram
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm pointer-events-none">
                @
              </span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue.replace(/^@/, "")}
                onChange={(e) => setInputValue(e.target.value.replace(/^@/, ""))}
                onKeyDown={handleKeyDown}
                placeholder="username"
                disabled={status === "loading"}
                className="w-full pl-7 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 focus:bg-white"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
            <button
              onClick={handleCheck}
              disabled={status === "loading" || !inputValue.trim()}
              className="px-4 py-3 rounded-xl text-white font-semibold text-sm instagram-gradient shadow-sm hover:opacity-90 active:opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[110px] justify-center"
            >
              {status === "loading" ? (
                <>
                  <svg className="w-4 h-4 spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Verificando
                </>
              ) : (
                <>
                  <SearchIcon className="w-4 h-4" />
                  Verificar
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
              <AlertIcon className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </p>
          )}
        </div>

        {result && status !== "loading" && (
          <div className="mt-4 result-enter">
            {status === "public" && (
              <ProfileCard result={result} accent="emerald" />
            )}

            {status === "private" && (
              <ProfileCard result={result} accent="amber" />
            )}

            {status === "not-found" && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-5 py-4 flex items-center gap-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-gray-400 flex items-center justify-center shadow-sm flex-shrink-0">
                    <UserXIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-700 text-sm">Conta Não Encontrada</p>
                    <p className="text-gray-500 text-xs">Esse usuário não existe no Instagram</p>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-gray-500">
                    Nenhuma conta encontrada para <span className="font-semibold text-gray-700">@{result.username}</span>.
                    Verifique se o nome de usuário está correto.
                  </p>
                </div>
              </div>
            )}

            {status === "rate-limited" && (
              <div className="bg-white rounded-2xl shadow-md border border-orange-100 overflow-hidden">
                <div className="bg-orange-50 px-5 py-4 flex items-center gap-3 border-b border-orange-100">
                  <div className="w-9 h-9 rounded-full bg-orange-400 flex items-center justify-center shadow-sm flex-shrink-0">
                    <AlertIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-orange-800 text-sm">Limite atingido</p>
                    <p className="text-orange-600 text-xs">O Instagram limitou as consultas temporariamente</p>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-gray-500">
                    O Instagram está limitando as consultas agora. Aguarde alguns minutos e tente novamente.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleReset}
              className="w-full mt-3 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-4"/>
              </svg>
              Verificar outra conta
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
          Os resultados são baseados em dados públicos do Instagram.<br />
          Funciona para qualquer conta, não só famosos.
        </p>
      </div>
    </div>
  );
}
