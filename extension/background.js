importScripts("config.js");

async function settings() {
  const s = await chrome.storage.sync.get(["server", "token"]);
  const server = (s.server || FX_CONFIG.server || "").replace(/\/+$/, "");
  const token = s.token || FX_CONFIG.token || "";
  return { server, token };
}

async function call(path, opts) {
  const c = await settings();
  if (!c.server || c.server.startsWith("__")) return { ok: false, error: "Extensão sem servidor configurado. Abra as opções da extensão." };
  if (!c.token || c.token.startsWith("__")) return { ok: false, error: "Extensão não conectada. Cole o código de conexão nas opções.", needsSetup: true };
  try {
    const res = await fetch(c.server + path, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + c.token, ...(opts && opts.headers) },
    });
    const data = await res.json().catch(() => ({ error: "Resposta inválida do servidor." }));
    return { ok: res.ok, status: res.status, server: c.server, ...data, needsSetup: res.status === 401 };
  } catch (e) {
    return { ok: false, server: c.server, error: "Sem conexão com o Fornexo. Verifique sua internet." };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  (async () => {
    if (msg.type === "import") return send(await call("/api/import", { method: "POST", body: JSON.stringify(msg.data) }));
    if (msg.type === "me") return send(await call("/api/import/me", { method: "GET" }));
    if (msg.type === "open") {
      const c = await settings();
      chrome.tabs.create({ url: c.server + (msg.path || "/f/importados") });
      return send({ ok: true });
    }
    if (msg.type === "options") {
      chrome.runtime.openOptionsPage();
      return send({ ok: true });
    }
    send({ ok: false });
  })();
  return true;
});
