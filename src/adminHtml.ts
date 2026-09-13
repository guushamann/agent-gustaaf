export const adminHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Admin — API Keys</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 1.3rem; }
    form, .toolbar { display: flex; gap: .5rem; margin: 1rem 0; }
    input, button { font-size: 1rem; padding: .45rem .7rem; }
    input { flex: 1; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: .45rem .5rem; border-bottom: 1px solid #8884; font-size: .9rem; }
    code { background: #8882; padding: .1rem .3rem; border-radius: 4px; }
    .revoked { opacity: .5; text-decoration: line-through; }
    #msg { margin: .5rem 0; min-height: 1.2em; }
    #msg.ok { color: #2e7d32; } #msg.err { color: #c62828; }
    button.danger { color: #c62828; }
    #created { background: #8882; padding: .75rem; border-radius: 8px; margin: .5rem 0; word-break: break-all; }
  </style>
</head>
<body>
  <h1>API Keys</h1>
  <form id="login">
    <input type="password" id="token" placeholder="Admin token (ADMIN_TOKEN)" required />
    <button type="submit">Unlock</button>
  </form>
  <div id="msg"></div>
  <div id="newkey" hidden><p>New key (copy now — it is shown only once):</p><div id="created"></div></div>
  <form id="add" hidden>
    <input id="name" placeholder="Key name (e.g. my-app)" />
    <button type="submit">Add key</button>
  </form>
  <table id="keys" hidden>
    <thead><tr><th>Name</th><th>Prefix</th><th>Created</th><th>Last used</th><th></th></tr></thead>
    <tbody id="rows"></tbody>
  </table>
  <script>
    let token = sessionStorage.getItem("adminToken") || "";
    const $ = (id) => document.getElementById(id);
    const msg = (text, cls) => { $("msg").textContent = text; $("msg").className = cls || ""; };

    async function api(path, opts = {}) {
      const res = await fetch(path, {
        ...opts,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, ...(opts.headers || {}) },
      });
      if (res.status === 401) { token = ""; sessionStorage.removeItem("adminToken"); showLogin(); throw new Error("Unauthorized"); }
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      return res.json();
    }

    function showLogin() {
      $("login").hidden = false;
      $("add").hidden = true;
      $("keys").hidden = true;
      $("newkey").hidden = true;
      $("token").value = "";
    }

    function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

    async function loadKeys() {
      const keys = await api("/admin/keys");
      $("rows").innerHTML = keys.map((k) =>
        "<tr>" +
        '<td class="' + (k.revoked_at ? "revoked" : "") + '">' + esc(k.name) + "</td>" +
        "<td><code>" + esc(k.prefix) + "…</code></td>" +
        "<td>" + esc(k.created_at) + "</td>" +
        "<td>" + esc(k.last_used_at || "—") + "</td>" +
        "<td>" + (k.revoked_at
          ? '<span class="revoked">revoked ' + esc(k.revoked_at) + "</span>"
          : '<button class="danger" onclick="revoke(' + k.id + ')">Revoke</button>') +
        "</td></tr>"
      ).join("");
      $("login").hidden = true;
      $("add").hidden = false;
      $("keys").hidden = false;
    }

    window.revoke = async (id) => {
      if (!confirm("Revoke this key? Clients using it will get 401.")) return;
      try { await api("/admin/keys/" + id, { method: "DELETE" }); msg("Key revoked", "ok"); await loadKeys(); }
      catch (e) { msg(e.message, "err"); }
    };

    $("login").addEventListener("submit", async (e) => {
      e.preventDefault();
      token = $("token").value.trim();
      try { sessionStorage.setItem("adminToken", token); await loadKeys(); msg("Unlocked", "ok"); }
      catch { msg("Invalid admin token", "err"); }
    });

    $("add").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const created = await api("/admin/keys", { method: "POST", body: JSON.stringify({ name: $("name").value }) });
        $("created").textContent = created.key;
        $("newkey").hidden = false;
        $("name").value = "";
        msg("Key created", "ok");
        await loadKeys();
      } catch (e) { msg(e.message, "err"); }
    });

    if (token) loadKeys().catch(() => showLogin());
  </script>
</body>
</html>`;