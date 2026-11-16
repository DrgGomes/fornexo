/* Fornexo Importador - leitores de anuncios.
 * Estrategia em camadas: dados estruturados (JSON-LD), metadados (Open Graph),
 * estrutura especifica de cada marketplace e, por ultimo, leitura generica da pagina.
 */
(function () {
  "use strict";

  var T = function (el) {
    return el ? (el.innerText || el.textContent || "").replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").trim() : "";
  };
  var Q = function (s, r) {
    try {
      return (r || document).querySelector(s);
    } catch (e) {
      return null;
    }
  };
  var QA = function (s, r) {
    try {
      return Array.prototype.slice.call((r || document).querySelectorAll(s));
    } catch (e) {
      return [];
    }
  };
  var uniq = function (a) {
    var seen = {};
    return a.filter(function (x) {
      if (!x || seen[x]) return false;
      seen[x] = 1;
      return true;
    });
  };
  var abs = function (u) {
    try {
      return new URL(u, location.href).href;
    } catch (e) {
      return "";
    }
  };
  var meta = function (n) {
    var el = Q('meta[property="' + n + '"]') || Q('meta[name="' + n + '"]') || Q('meta[itemprop="' + n + '"]');
    return el ? (el.getAttribute("content") || "").trim() : "";
  };
  var cap = function (s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  };

  /* ---------- JSON-LD ---------- */
  function jsonLdProduct() {
    var scripts = QA('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i++) {
      try {
        var data = JSON.parse(scripts[i].textContent);
        var stack = Array.isArray(data) ? data.slice() : [data];
        while (stack.length) {
          var n = stack.shift();
          if (!n || typeof n !== "object") continue;
          if (Array.isArray(n["@graph"])) stack = stack.concat(n["@graph"]);
          var t = n["@type"];
          if (t === "Product" || (Array.isArray(t) && t.indexOf("Product") >= 0)) return n;
        }
      } catch (e) {}
    }
    return null;
  }
  function ldImages(p) {
    if (!p || !p.image) return [];
    var arr = Array.isArray(p.image) ? p.image : [p.image];
    return arr
      .map(function (x) {
        return typeof x === "string" ? x : x && (x.url || x.contentUrl);
      })
      .filter(Boolean);
  }
  function ldPrice(p) {
    if (!p || !p.offers) return null;
    var o = Array.isArray(p.offers) ? p.offers[0] : p.offers;
    return o ? o.price || o.lowPrice || o.highPrice || null : null;
  }
  function ldBrand(p) {
    if (!p || !p.brand) return "";
    return typeof p.brand === "string" ? p.brand : p.brand.name || "";
  }

  /* ---------- Imagens ---------- */
  function bestFromSrcset(ss) {
    if (!ss) return "";
    var best = "",
      bw = 0;
    ss.split(",").forEach(function (part) {
      var p = part.trim().split(/\s+/);
      var w = parseFloat(p[1]) || 1;
      if (p[0] && w >= bw) {
        bw = w;
        best = p[0];
      }
    });
    return best;
  }
  function isTinyIcon(img) {
    var w = img.naturalWidth || img.width || 0;
    var h = img.naturalHeight || img.height || 0;
    return w > 0 && h > 0 && w < 60 && h < 60;
  }
  function imgUrls(root, hostRe, exclude) {
    var out = [];
    QA("img", root).forEach(function (img) {
      if (isTinyIcon(img)) return;
      var cands = [
        img.getAttribute("data-zoom"),
        img.getAttribute("data-zoom-src"),
        img.getAttribute("data-src"),
        img.getAttribute("data-lazy"),
        bestFromSrcset(img.getAttribute("srcset") || img.getAttribute("data-srcset")),
        img.currentSrc,
        img.getAttribute("src"),
      ];
      for (var i = 0; i < cands.length; i++) {
        var c = cands[i];
        if (!c || c.indexOf("data:") === 0) continue;
        var u = abs(c);
        if (!/^https?:/.test(u)) continue;
        if (hostRe && !hostRe.test(u)) continue;
        if (exclude && exclude.test(u)) continue;
        out.push(u);
        break;
      }
    });
    QA("[style*='background-image']", root).forEach(function (el) {
      var m = (el.style.backgroundImage || "").match(/url\(["']?(.*?)["']?\)/);
      if (!m) return;
      var u = abs(m[1]);
      if (hostRe && !hostRe.test(u)) return;
      if (exclude && exclude.test(u)) return;
      out.push(u);
    });
    return uniq(out);
  }

  /* ---------- Preco ---------- */
  function priceFromText(root) {
    var txt = T(root || document.body);
    var m = txt.match(/R\$\s*([\d.]+(?:,\d{1,2})?)/);
    return m ? m[1] : null;
  }

  /* ---------- Secoes por titulo (Descricao, Especificacoes...) ---------- */
  function findLabel(re) {
    var els = QA("h1,h2,h3,h4,h5,h6,div,span,p,strong,b,label,section,summary,button");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.children.length > 3) continue;
      var t = T(el);
      if (t && t.length < 70 && re.test(t)) return el;
    }
    return null;
  }
  function sectionEl(re) {
    var lab = findLabel(re);
    if (!lab) return null;
    var n = lab;
    for (var i = 0; i < 5 && n; i++) {
      var sib = n.nextElementSibling;
      while (sib && !T(sib)) sib = sib.nextElementSibling;
      if (sib && T(sib).length > 15) return sib;
      n = n.parentElement;
    }
    return null;
  }
  function sectionText(re) {
    return T(sectionEl(re));
  }

  /* ---------- Caracteristicas (pares nome/valor) ---------- */
  function pairsIn(root) {
    if (!root) return [];
    var out = [];
    QA("tr", root).forEach(function (tr) {
      var c = QA("th,td", tr);
      if (c.length >= 2) out.push([T(c[0]), T(c[c.length - 1])]);
    });
    QA("dt", root).forEach(function (dt) {
      var dd = dt.nextElementSibling;
      if (dd && dd.tagName === "DD") out.push([T(dt), T(dd)]);
    });
    if (!out.length) {
      QA("div,li", root).forEach(function (el) {
        var ch = el.children;
        if (ch.length !== 2) return;
        var a = T(ch[0]),
          b = T(ch[1]);
        if (a && b && a.length < 60 && b.length < 400 && a.indexOf("\n") < 0 && a !== b) out.push([a, b]);
      });
    }
    var seen = {};
    return out
      .map(function (p) {
        return { name: p[0].replace(/:$/, "").trim(), value: p[1].replace(/\s+/g, " ").trim() };
      })
      .filter(function (a) {
        var k = a.name.toLowerCase();
        if (!a.name || !a.value || seen[k] || a.name.length > 80) return false;
        seen[k] = 1;
        return true;
      })
      .slice(0, 60);
  }

  /* ---------- Variacoes ---------- */
  var VAR_NAMES = /^(cor|cores|color|colou?r|tamanho|tamanhos|size|modelo|voltagem|estampa|sabor|tipo|capacidade|numera[cç][aã]o|material|kit|tecido|formato)\b\s*:?/i;
  var NOT_VALUE = /comprar|adicionar|carrinho|chat|seguir|ver mais|quantidade|frete|cupom|compartilhar|denunciar|favorit|guia de|tabela de medidas/i;
  function variationsGeneric(root) {
    var res = [];
    QA("label,span,div,h3,h4,p,legend,dt", root || document).forEach(function (lab) {
      if (res.length >= 3) return;
      var t = T(lab);
      if (!t || t.length > 40 || t.indexOf("\n") >= 0 || lab.children.length > 2 || !VAR_NAMES.test(t)) return;
      var name = cap(t.split(":")[0].trim());
      if (res.some(function (r) { return r.name.toLowerCase() === name.toLowerCase(); })) return;
      var c = lab.parentElement;
      for (var i = 0; i < 3 && c && QA("button,[role=radio],[role=option],li,a[aria-label]", c).length < 2; i++) c = c.parentElement;
      if (!c) return;
      var vals = uniq(
        QA("button,[role=radio],[role=option],li,a[aria-label]", c)
          .map(function (b) {
            var img = b.querySelector("img");
            var v = b.getAttribute("aria-label") || T(b) || (img && img.alt) || b.getAttribute("title") || "";
            return v.split("\n")[0].trim();
          })
          .filter(function (v) {
            return v && v.length < 60 && !VAR_NAMES.test(v) && !NOT_VALUE.test(v);
          }),
      );
      if (vals.length) res.push({ name: name, values: vals.slice(0, 40) });
    });
    return res;
  }

  /* ---------- Container do produto (evita fotos de avaliacoes e sugestoes) ---------- */
  function findByText(text) {
    if (!text) return null;
    var key = text.slice(0, 40);
    var els = QA("h1,h2,div,span");
    for (var i = 0; i < els.length; i++) {
      if (els[i].children.length <= 1 && T(els[i]).indexOf(key) === 0) return els[i];
    }
    return null;
  }
  function briefing(anchor, hostRe) {
    var c = anchor;
    for (var i = 0; i < 12 && c; i++) {
      c = c.parentElement;
      if (c && imgUrls(c, hostRe).length >= 2) return c;
    }
    return document.body;
  }

  /* ---------- Marketplaces ---------- */
  function mercadoLivre() {
    var ld = jsonLdProduct();
    var title = T(Q("h1.ui-pdp-title")) || (ld && ld.name) || meta("og:title");
    var priceMeta = Q('.ui-pdp-price__second-line meta[itemprop="price"]') || Q('meta[itemprop="price"]');
    var price = (priceMeta && priceMeta.getAttribute("content")) || ldPrice(ld) || priceFromText(Q(".ui-pdp-price__second-line"));
    var galleryRoot = Q(".ui-pdp-gallery") || Q('[class*="ui-pdp-gallery"]') || document;
    var images = imgUrls(galleryRoot, /mlstatic\.com/).filter(function (u) {
      return /\/D_/.test(u);
    });
    images = uniq(images.concat(ldImages(ld)));
    var description = T(Q(".ui-pdp-description__content")) || T(Q('[class*="description__content"]'));
    var attributes = pairsIn(Q(".ui-vpp-highlighted-specs") || Q('[class*="highlighted-specs"]'))
      .concat(pairsIn(Q(".ui-pdp-specs") || Q('[class*="ui-pdp-specs"]') || Q(".andes-table")));
    var variations = [];
    QA('.ui-pdp-variations__picker, [class*="ui-pdp-variations__picker"]').forEach(function (p) {
      var lab = T(Q('.ui-pdp-variations__label, [class*="variations__label"]', p));
      var name = cap((lab.split(":")[0] || "").trim());
      if (!name) return;
      var vals = uniq(
        QA("a,button,li,img[alt]", p)
          .map(function (el) {
            return (el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("alt") || T(el) || "").split("\n")[0].trim();
          })
          .filter(function (v) {
            return v && v.length < 60 && v.toLowerCase() !== name.toLowerCase() && !NOT_VALUE.test(v) && !/^\d+$/.test(v);
          }),
      );
      var selected = (lab.split(":")[1] || "").trim();
      if (!vals.length && selected) vals = [selected];
      if (vals.length) variations.push({ name: name, values: vals });
    });
    if (!variations.length) variations = variationsGeneric(Q(".ui-pdp-container") || document);
    var sku = (location.href.match(/MLB-?\d+/i) || [""])[0].replace("-", "");
    return {
      source: "MERCADO_LIVRE",
      title: title,
      price: price,
      images: images,
      description: description,
      attributes: attributes,
      variations: variations,
      brand: ldBrand(ld),
      sku: (ld && ld.sku) || sku,
      gtin: (ld && (ld.gtin13 || ld.gtin)) || "",
    };
  }

  function shopee() {
    var ld = jsonLdProduct();
    var re = /(susercontent\.com|cf\.shopee\.com\.br|shopee\.com\.br)\/file\//;
    var titleEl = Q("h1");
    var title = T(titleEl) || (ld && ld.name) || (meta("og:title") || document.title).replace(/\s*[|-]\s*Shopee.*$/i, "");
    var anchor = titleEl || findByText(title);
    var root = briefing(anchor, re);
    var images = imgUrls(root, re).concat(ldImages(ld));
    var price = ldPrice(ld) || priceFromText(root);
    var description = sectionText(/^descri[cç][aã]o do produto$/i) || sectionText(/^descri[cç][aã]o$/i) || (ld && ld.description) || "";
    var attributes = pairsIn(sectionEl(/^(especifica[cç][oõ]es|detalhes|caracter[ií]sticas) do produto$/i));
    var variations = [];
    var groups = [];
    QA('button.product-variation, button[class*="product-variation"]', root).forEach(function (b) {
      var g = b.parentElement;
      if (groups.indexOf(g) < 0) groups.push(g);
    });
    groups.forEach(function (g) {
      var labEl = g.previousElementSibling || (g.parentElement && g.parentElement.previousElementSibling);
      var name = cap(T(labEl).split("\n")[0].trim());
      var vals = uniq(
        QA("button", g).map(function (b) {
          return (b.getAttribute("aria-label") || T(b)).split("\n")[0].trim();
        }),
      );
      if (name && name.length < 40 && vals.length) variations.push({ name: name, values: vals });
    });
    if (!variations.length) variations = variationsGeneric(root);
    return {
      source: "SHOPEE",
      title: title,
      price: price,
      images: uniq(images),
      description: description,
      attributes: attributes,
      variations: variations.slice(0, 3),
      brand: ldBrand(ld),
      sku: (location.href.match(/i\.(\d+)\.(\d+)/) || [])[2] || "",
      gtin: "",
    };
  }

  function bigTikTok(u) {
    // miniaturas da galeria -> versao grande
    return u.replace(/(resize[-\w]*):(\d+):(\d+)/, "$1:800:800");
  }
  function tiktok() {
    var ld = jsonLdProduct();
    var re = /(ibyteimg\.com|tiktokcdn|ttwstatic\.com|byteimg\.com|tiktokcdn-us\.com)/;
    var exclude = /avatar|emoji|icon|logo|badge|-obj\/|\/obj\//i;
    var titleEl = Q("h1");
    var title = T(titleEl) || (ld && ld.name) || meta("og:title") || document.title.replace(/\s*[|-]\s*TikTok.*$/i, "");
    var anchor = titleEl || findByText(title);
    var root = briefing(anchor, re);
    var images = uniq(imgUrls(root, re, exclude).map(bigTikTok).concat(ldImages(ld)));
    var price = ldPrice(ld) || priceFromText(root);
    var description =
      sectionText(/^(descri[cç][aã]o( do produto)?|description|product description|sobre este produto|about this product|detalhes do produto|product details)$/i) ||
      (ld && ld.description) ||
      meta("og:description");
    var attributes = pairsIn(sectionEl(/^(especifica[cç][oõ]es|specifications|especifica[cç][oõ]es do produto|product specifications)$/i));
    return {
      source: "TIKTOK",
      title: title,
      price: price,
      images: images,
      description: description,
      attributes: attributes,
      variations: variationsGeneric(root),
      brand: ldBrand(ld),
      sku: (location.href.match(/(?:product|pdp)\/(?:[^/?]*\/)?(\d{8,})/) || [])[1] || "",
      gtin: "",
    };
  }

  /* Temu: classes mudam a cada versao do site, entao lemos por estrutura e atributos */
  var TEMU_IMG = /^https?:\/\/img\.kwcdn\.com\//i;
  function temuImgUrl(img) {
    var c = [img.getAttribute("data-src"), img.currentSrc, img.getAttribute("src")];
    for (var i = 0; i < c.length; i++) {
      if (c[i] && TEMU_IMG.test(c[i])) return c[i].split("?")[0];
    }
    var bg = img.parentElement && img.parentElement.style && img.parentElement.style.backgroundImage;
    var m = (bg || "").match(/url\(["']?(.*?)["']?\)/);
    return m && TEMU_IMG.test(m[1]) ? m[1].split("?")[0] : "";
  }
  function temuTitle(ld) {
    var docTitle = document.title.replace(/\s*[|\-–]\s*Temu.*$/i, "").trim();
    var cands = QA("span[aria-label],h1[aria-label],div[aria-label]").filter(function (el) {
      var a = (el.getAttribute("aria-label") || "").trim();
      return a.length >= 12 && a.length <= 300 && a === T(el) && !/R\$|\d+\s*(de|of)\s*\d+/i.test(a);
    });
    var best = null;
    for (var i = 0; i < cands.length; i++) {
      var a = cands[i].getAttribute("aria-label").trim();
      if (docTitle && (docTitle.indexOf(a.slice(0, 25)) === 0 || a.indexOf(docTitle.slice(0, 25)) === 0)) return a;
      if (!best) best = a;
    }
    return best || (ld && ld.name) || meta("og:title").replace(/\s*[|\-–]\s*Temu.*$/i, "") || docTitle || T(Q("h1"));
  }
  function temuGallery() {
    var imgs = QA("img").filter(function (img) {
      var lab = (img.getAttribute("aria-label") || "") + " " + (img.getAttribute("alt") || "");
      return /(imagem|image|foto)\s*\d+\s*(de|of)\s*\d+/i.test(lab) || /detalhes\s*\d+$|details\s*\d+$/i.test((img.getAttribute("alt") || "").trim());
    });
    var urls = uniq(imgs.map(temuImgUrl).filter(Boolean));
    return { imgs: imgs, urls: urls };
  }
  function temuHighlights() {
    var lab = QA("span,div").find(function (el) {
      return el.children.length === 0 && /^(destaques|highlights)$/i.test(T(el));
    });
    if (!lab) return [];
    var box = lab;
    for (var i = 0; i < 6 && box; i++) {
      if (T(box).length > T(lab).length + 30) break;
      box = box.parentElement;
    }
    if (!box) return [];
    return uniq(
      QA("div", box)
        .filter(function (d) {
          return !Q("div", d) && T(d).length > 10 && !/^(destaques|highlights)$/i.test(T(d));
        })
        .map(function (d) {
          return T(d).replace(/\s+/g, " ").replace(/\s+,/g, ",");
        }),
    );
  }
  function temuFormat(txt) {
    return txt
      .replace(/\s+/g, " ")
      .replace(/\s*(Benef[ií]cios|Caracter[ií]sticas:|Marca:|Material:|Composi[cç][aã]o:|Tabela de Medidas|Medidas:|Cor:|Tamanho:|Conte[uú]do da embalagem)/gi, "\n$1")
      .replace(/\s+((?:PP|P|M|G|GG|XG|XGG|G\d|\d{2})\s+[—–-]\s+)/g, "\n$1")
      .trim();
  }

  function temu() {
    var ld = jsonLdProduct();
    var title = temuTitle(ld);
    var gal = temuGallery();
    var images = gal.urls;
    if (images.length === 0) {
      var anchor = findByText(title) || Q("h1");
      images = uniq(
        imgUrls(briefing(anchor, TEMU_IMG), TEMU_IMG, /avatar|icon|logo|badge/i)
          .map(function (u) {
            return u.split("?")[0];
          })
          .concat(ldImages(ld).filter(function (u) {
            return TEMU_IMG.test(u);
          })),
      );
    }
    // descricao: bloco de texto que fica junto das fotos de detalhes do anuncio
    var description = "";
    if (gal.imgs.length) {
      // sobe a partir da ultima foto de detalhes ate antes de englobar titulo/destaques/recomendados
      var stopEl = findByText(title);
      var hlLab = QA("span,div").find(function (el) {
        return el.children.length === 0 && /^(destaques|highlights)$/i.test(T(el));
      });
      var box = gal.imgs[gal.imgs.length - 1];
      while (box.parentElement && box.parentElement !== document.body) {
        var up = box.parentElement;
        if ((stopEl && up.contains(stopEl)) || (hlLab && up.contains(hlLab)) || /voc[eê] tamb[eé]m pode gostar|recomendad|you may also like/i.test(T(up))) break;
        box = up;
      }
      var txt = T(box).replace(/^\s*(detalhes do produto|descri[cç][aã]o( do produto)?|product details)\s*/i, "");
      if (txt.length >= 20 && txt.length < 8000) description = temuFormat(txt);
    }
    if (!description) description = sectionText(/^(descri[cç][aã]o|detalhes do produto|product details|description)$/i) || (ld && ld.description) || meta("og:description");
    var hl = temuHighlights();
    if (hl.length) description = (description ? description + "\n\n" : "") + "Destaques:\n" + hl.map(function (h) {
      return "- " + h;
    }).join("\n");
    var titleEl = findByText(title);
    var root = briefing(titleEl, TEMU_IMG);
    var attributes = pairsIn(sectionEl(/^(detalhes do produto|especifica[cç][oõ]es|product details|specifications)$/i));
    return {
      source: "TEMU",
      title: title,
      price: ldPrice(ld) || priceFromText(root),
      images: images,
      description: description,
      attributes: attributes,
      variations: variationsGeneric(root),
      brand: ldBrand(ld),
      sku: (location.href.match(/-g-(\d+)\.html/) || location.href.match(/goods_id=(\d+)/) || [])[1] || "",
      gtin: "",
    };
  }

  function generic() {
    var ld = jsonLdProduct();
    var title = (ld && ld.name) || T(Q("h1")) || meta("og:title") || document.title;
    var images = uniq(ldImages(ld).concat([meta("og:image")]).filter(Boolean));
    if (images.length < 2) images = uniq(images.concat(imgUrls(briefing(Q("h1"), null))));
    return {
      source: "OUTRO",
      title: title,
      price: ldPrice(ld) || meta("product:price:amount") || priceFromText(briefing(Q("h1"), null)),
      images: images,
      description: (ld && ld.description) || meta("og:description"),
      attributes: [],
      variations: variationsGeneric(document),
      brand: ldBrand(ld),
      sku: (ld && ld.sku) || "",
      gtin: (ld && (ld.gtin13 || ld.gtin)) || "",
    };
  }

  /* URL sem parametros de rastreio (TikTok/Shopee chegam a milhares de caracteres) */
  function cleanUrl() {
    var keep = ["goods_id", "item_id", "shop_id", "product_id", "id"];
    var q = new URLSearchParams();
    keep.forEach(function (k) {
      var v = new URLSearchParams(location.search).get(k);
      if (v) q.set(k, v);
    });
    var qs = q.toString();
    return (location.origin + location.pathname + (qs ? "?" + qs : "")).slice(0, 1900);
  }

  function detect() {
    var h = location.hostname;
    var p = location.pathname + location.search;
    if (/mercadoli(vre|bre)/.test(h)) return { source: "MERCADO_LIVRE", isProduct: /MLB-?\d+|\/p\/MLB|\/up\/MLB/i.test(p) || !!Q("h1.ui-pdp-title") };
    if (/shopee/.test(h)) return { source: "SHOPEE", isProduct: /-i\.\d+\.\d+|\/product\/\d+\/\d+/.test(p) };
    if (/tiktok\.com/.test(h)) return { source: "TIKTOK", isProduct: /\/view\/product\/|\/shop\/pdp\/|\/product\/\d+|\/pdp\//.test(p) };
    if (/temu\.com/.test(h)) return { source: "TEMU", isProduct: /-g-\d+\.html|goods\.html|goods_id=/.test(p) };
    return { source: "OUTRO", isProduct: !!jsonLdProduct() };
  }

  function extract() {
    var d = detect();
    var data;
    try {
      data =
        d.source === "MERCADO_LIVRE" ? mercadoLivre() : d.source === "SHOPEE" ? shopee() : d.source === "TIKTOK" ? tiktok() : d.source === "TEMU" ? temu() : generic();
    } catch (e) {
      data = generic();
      data.source = d.source;
    }
    // reforco com metadados quando algo faltar
    if (!data.title) data.title = meta("og:title") || document.title;
    if (!data.images || !data.images.length) data.images = [meta("og:image")].filter(Boolean);
    data.title = (data.title || "").replace(/\s+/g, " ").trim().slice(0, 300);
    data.description = (data.description || "").trim().slice(0, 30000);
    data.price = data.price != null ? String(data.price) : null;
    data.url = cleanUrl();
    data.images = uniq((data.images || []).map(abs)).filter(function (u) {
      return u && u.length < 6000;
    }).slice(0, 40);
    return data;
  }

  window.FXExtract = { detect: detect, extract: extract };
})();
