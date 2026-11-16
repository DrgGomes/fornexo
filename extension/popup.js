(function () {
  if (location.search.indexOf("popup") < 0 && window.innerWidth > 500) document.body.classList.add("tab");
  var $ = function (id) { return document.getElementById(id); };
  var status = $("status");

  function setStatus(kind, text) {
    status.className = "status " + kind;
    status.textContent = text;
  }

  function test() {
    setStatus("", "Verificando conexão...");
    chrome.runtime.sendMessage({ type: "me" }, function (res) {
      if (res && res.ok) setStatus("ok", "Conectado a " + res.supplier + ". Pronto para importar.");
      else {
        setStatus("err", (res && res.error) || "Não conectado.");
        $("adv").open = true;
      }
    });
  }

  chrome.storage.sync.get(["server", "token"], function (s) {
    var server = s.server || FX_CONFIG.server;
    var token = s.token || FX_CONFIG.token;
    $("server").value = server && server.indexOf("__") !== 0 ? server : "";
    $("token").value = token && token.indexOf("__") !== 0 ? token : "";
    test();
  });

  $("save").onclick = function () {
    var server = $("server").value.trim().replace(/\/+$/, "");
    var token = $("token").value.trim();
    chrome.storage.sync.set({ server: server, token: token }, test);
  };
  $("open").onclick = function () {
    chrome.runtime.sendMessage({ type: "open", path: "/f/importados" });
    window.close();
  };
})();
