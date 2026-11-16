/* Fornexo Importador - botao flutuante IMPORTAR */
(function () {
  "use strict";
  if (window.__fornexoImporter) return;
  window.__fornexoImporter = true;

  var host = document.createElement("div");
  host.id = "fornexo-importador";
  host.style.cssText = "all:initial;position:fixed;right:0;bottom:0;width:0;height:0;z-index:2147483647;";
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML =
    '<style>' +
    ":host{all:initial}" +
    ".wrap{position:fixed;right:20px;bottom:20px;display:flex;flex-direction:column;align-items:flex-end;gap:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}" +
    ".btn{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:10px;height:52px;padding:0 20px 0 14px;border-radius:999px;background:#18181b;color:#fff;font-size:15px;font-weight:700;letter-spacing:.04em;box-shadow:0 10px 30px rgba(0,0,0,.28);transition:transform .15s,background .15s}" +
    ".btn:hover{transform:translateY(-1px);background:#27272a}.btn:active{transform:scale(.97)}.btn[disabled]{opacity:.75;cursor:progress}" +
    ".logo{width:28px;height:28px;border-radius:9px;background:#fff;color:#18181b;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800}" +
    ".x{all:unset;cursor:pointer;width:22px;height:22px;border-radius:999px;background:#fff;color:#71717a;font-size:13px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.18);position:absolute;top:-6px;right:-6px}" +
    ".rel{position:relative}" +
    ".toast{box-sizing:border-box;width:320px;max-width:calc(100vw - 40px);background:#fff;color:#18181b;border-radius:16px;padding:14px 16px;box-shadow:0 14px 40px rgba(0,0,0,.22);font-size:13.5px;line-height:1.45;border:1px solid #e4e4e7}" +
    ".toast b{display:block;font-size:14px;margin-bottom:2px}.toast.err{border-color:#fecaca;background:#fef2f2;color:#7f1d1d}.toast.ok{border-color:#bbf7d0}" +
    ".row{display:flex;gap:8px;margin-top:10px}.lnk{all:unset;cursor:pointer;font-weight:600;font-size:13px;padding:7px 12px;border-radius:10px;background:#18181b;color:#fff}.lnk.sec{background:#f4f4f5;color:#18181b}" +
    ".spin{width:16px;height:16px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:s .7s linear infinite}@keyframes s{to{transform:rotate(360deg)}}" +
    "</style>" +
    '<div class="wrap"><div class="toast" hidden></div><div class="rel"><button class="btn" type="button"><span class="logo">F</span><span class="lbl">IMPORTAR</span></button><button class="x" type="button" title="Ocultar nesta página">&times;</button></div></div>';

  var btn = root.querySelector(".btn");
  var lbl = root.querySelector(".lbl");
  var toast = root.querySelector(".toast");
  var closeBtn = root.querySelector(".x");
  var hidden = false;
  var toastTimer = null;

  function esc(s) {
    return String(s || "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function show(kind, title, text, actions) {
    clearTimeout(toastTimer);
    toast.className = "toast " + kind;
    toast.innerHTML = "<b>" + esc(title) + "</b>" + esc(text) + (actions && actions.length ? '<div class="row"></div>' : "");
    if (actions) {
      var row = toast.querySelector(".row");
      actions.forEach(function (a) {
        var el = document.createElement("button");
        el.type = "button";
        el.className = "lnk" + (a.secondary ? " sec" : "");
        el.textContent = a.label;
        el.onclick = a.onClick;
        row.appendChild(el);
      });
    }
    toast.hidden = false;
    toastTimer = setTimeout(function () {
      toast.hidden = true;
    }, kind === "err" ? 12000 : 9000);
  }

  function setBusy(on, text) {
    btn.disabled = on;
    lbl.textContent = text || "IMPORTAR";
    var old = btn.querySelector(".spin");
    if (on && !old) {
      var sp = document.createElement("span");
      sp.className = "spin";
      btn.replaceChild(sp, btn.querySelector(".logo"));
    } else if (!on && old) {
      var logo = document.createElement("span");
      logo.className = "logo";
      logo.textContent = "F";
      btn.replaceChild(logo, old);
    }
  }

  function sleep(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }

  // Rola a pagina rapidamente para carregar fotos e descricao (carregamento sob demanda)
  async function warmUp() {
    var startY = window.scrollY;
    var h = Math.min(document.body.scrollHeight, 9000);
    for (var y = 0; y <= h; y += Math.max(600, h / 8)) {
      window.scrollTo(0, y);
      await sleep(120);
    }
    window.scrollTo(0, startY);
    await sleep(250);
  }

  function send(msg) {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage(msg, function (res) {
          if (chrome.runtime.lastError) resolve({ ok: false, error: "Extensão atualizada. Recarregue a página e tente de novo." });
          else resolve(res || { ok: false, error: "Sem resposta da extensão." });
        });
      } catch (e) {
        resolve({ ok: false, error: "Extensão atualizada. Recarregue a página e tente de novo." });
      }
    });
  }

  btn.addEventListener("click", async function () {
    if (btn.disabled) return;
    setBusy(true, "LENDO ANÚNCIO...");
    toast.hidden = true;
    try {
      await warmUp();
      var data = window.FXExtract.extract();
      if (!data.title || !data.images.length) {
        show("err", "Produto não encontrado", "Abra a página de um produto (com fotos e título) e toque em IMPORTAR.");
        return;
      }
      setBusy(true, "ENVIANDO...");
      var res = await send({ type: "import", data: data });
      if (res && res.ok) {
        var info = res.images + (res.images === 1 ? " foto" : " fotos") + (data.variations.length ? ", " + data.variations.length + " tipo(s) de variação" : "") + ". ";
        show(
          "ok",
          res.alreadyRegistered ? "Já cadastrado no seu catálogo" : res.updated ? "Importação atualizada" : "Importado com sucesso",
          info + "Confira em Importados no seu painel.",
          [{ label: "Abrir Importados", onClick: function () { send({ type: "open", path: "/f/importados" }); } }],
        );
      } else {
        var acts = res && res.needsSetup ? [{ label: "Configurar extensão", onClick: function () { send({ type: "options" }); } }] : [];
        show("err", "Não foi possível importar", (res && res.error) || "Erro desconhecido.", acts);
      }
    } catch (e) {
      show("err", "Não foi possível ler o anúncio", "Recarregue a página e tente novamente.");
    } finally {
      setBusy(false);
    }
  });

  closeBtn.addEventListener("click", function () {
    hidden = true;
    host.style.display = "none";
  });

  // Mostra o botao apenas em paginas de produto (sites SPA mudam a URL sem recarregar)
  var lastUrl = "";
  function sync() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    var d = window.FXExtract.detect();
    host.style.display = !hidden && d.isProduct ? "" : "none";
  }
  function mount() {
    if (!document.body) return setTimeout(mount, 300);
    document.documentElement.appendChild(host);
    sync();
    setInterval(sync, 1000);
  }
  mount();
})();
