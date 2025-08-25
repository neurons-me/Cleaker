// src/cleaker.js
// Minimal, singleton-style Cleaker client with a session-bound `me()` facade.
// Talks to api.cleaker.me GraphQL (this.me over Postgres).
// Default endpoint: http://localhost:8888/graphql

class CleakerCore {
  constructor({ endpoint = "http://localhost:8888/graphql", fetchImpl } = {}) {
    this.endpoint = endpoint;
    this.fetch = fetchImpl || (typeof fetch !== "undefined" ? fetch.bind(window) : null);
    if (!this.fetch) throw new Error("No fetch implementation available");
    this._session = null; // { username, password, contextId? }
  }

  // ---- low-level GraphQL ----
  async _gql(query, variables = {}) {
    const res = await this.fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors.map(e => e.message).join("; "));
    return json.data;
  }

  // ---- public info / health ----
  async status() {
    const q = `query{ status }`;
    const d = await this._gql(q);
    return d.status;
  }
  async listIdentities() {
    const q = `query{ list_identities { username } }`;
    const d = await this._gql(q);
    return d.list_identities;
  }
  async publicInfo(username) {
    const q = `query($u:String!){ public_info(username:$u){ username public_key } }`;
    const d = await this._gql(q, { u: username });
    return d.public_info; // null | { username, public_key }
  }

  // ---- identity management (stateless helpers) ----
  async create(username, password) {
    const q = `mutation($u:String!,$p:String!){ create(username:$u,password:$p) }`;
    const d = await this._gql(q, { u: username, p: password });
    return d.create === true;
  }
  async changePassword(username, oldPassword, newPassword) {
    const q = `mutation($u:String!,$o:String!,$n:String!){
      changePassword(username:$u, old_password:$o, new_password:$n)
    }`;
    const d = await this._gql(q, { u: username, o: oldPassword, n: newPassword });
    return d.changePassword === true;
  }

  // ---- verbs (raw) ----
  async _be({ username, password, key, value, contextId }) {
    const q = `mutation($u:String!,$p:String!,$k:String!,$v:String!,$c:String){
      be(username:$u,password:$p,key:$k,value:$v,context_id:$c)
    }`;
    const d = await this._gql(q, { u: username, p: password, k: key, v: value, c: contextId ?? null });
    return d.be === true;
  }
  async _have({ username, password, key, value, contextId }) {
    const q = `mutation($u:String!,$p:String!,$k:String!,$v:String!,$c:String){
      have(username:$u,password:$p,key:$k,value:$v,context_id:$c)
    }`;
    const d = await this._gql(q, { u: username, p: password, k: key, v: value, c: contextId ?? null });
    return d.have === true;
  }
  async _do({ username, password, key, value, contextId }) {
    const q = `mutation($u:String!,$p:String!,$k:String!,$v:String!,$c:String){
      do_(username:$u,password:$p,key:$k,value:$v,context_id:$c)
    }`;
    const d = await this._gql(q, { u: username, p: password, k: key, v: value, c: contextId ?? null });
    return d.do_ === true;
  }
  async _at({ username, password, key, value, contextId }) {
    const q = `mutation($u:String!,$p:String!,$k:String!,$v:String!,$c:String){
      at(username:$u,password:$p,key:$k,value:$v,context_id:$c)
    }`;
    const d = await this._gql(q, { u: username, p: password, k: key, v: value, c: contextId ?? null });
    return d.at === true;
  }
  async _relate({ username, password, key, value, contextId }) {
    const q = `mutation($u:String!,$p:String!,$k:String!,$v:String!,$c:String){
      relate(username:$u,password:$p,key:$k,value:$v,context_id:$c)
    }`;
    const d = await this._gql(q, { u: username, p: password, k: key, v: value, c: contextId ?? null });
    return d.relate === true;
  }
  async _react({ username, password, key, value, contextId }) {
    const q = `mutation($u:String!,$p:String!,$k:String!,$v:String!,$c:String){
      react(username:$u,password:$p,key:$k,value:$v,context_id:$c)
    }`;
    const d = await this._gql(q, { u: username, p: password, k: key, v: value, c: contextId ?? null });
    return d.react === true;
  }
  async _communicate({ username, password, key, value, contextId }) {
    const q = `mutation($u:String!,$p:String!,$k:String!,$v:String!,$c:String){
      communicate(username:$u,password:$p,key:$k,value:$v,context_id:$c)
    }`;
    const d = await this._gql(q, { u: username, p: password, k: key, v: value, c: contextId ?? null });
    return d.communicate === true;
  }

  // ---- query ----
  async _get({ username, password, filter }) {
    const q = `query($u:String!,$p:String!,$f:GetFilter!){
      get(username:$u,password:$p, filter:$f){ verb key value timestamp }
    }`;
    const d = await this._gql(q, {
      u: username,
      p: password,
      f: {
        verb: filter.verb,
        key: filter.key ?? null,
        value: filter.value ?? null,
        context_id: filter.context_id ?? null,
        limit: filter.limit ?? null,
        offset: filter.offset ?? null,
        since: filter.since ?? null,
        until: filter.until ?? null,
      },
    });
    return d.get;
  }

  // ---- session facade ----
  /**
   * Bind username/password (and optional contextId) to a session facade
   * so you can call: (await cleaker.me(u,p)).react(k,v)
   */
  async me(username, password, { contextId = null } = {}) {
    // cache a single session; if creds change, replace
    if (!this._session || this._session.username !== username || this._session.password !== password) {
      this._session = { username, password, contextId };
    } else if (contextId != null) {
      this._session.contextId = contextId;
    }

    const self = this;
    const sess = () => ({ username: self._session.username, password: self._session.password, contextId: self._session.contextId ?? null });

    return {
      // identity helpers
      create: async (pwd) => self.create(username, pwd),
      changePassword: async (oldPwd, newPwd) => self.changePassword(username, oldPwd, newPwd),

      // context helpers
      setContext: (cid) => { self._session.contextId = cid; return this; },
      getContext: () => self._session.contextId ?? null,

      // verbs
      be:         (key, value) => self._be({ ...sess(), key, value }),
      have:       (key, value) => self._have({ ...sess(), key, value }),
      do:         (key, value) => self._do({ ...sess(), key, value }),
      at:         (key, value) => self._at({ ...sess(), key, value }),
      relate:     (key, value) => self._relate({ ...sess(), key, value }),
      react:      (key, value) => self._react({ ...sess(), key, value }),
      communicate:(key, value) => self._communicate({ ...sess(), key, value }),

      // query
      get:        (filter)     => self._get({ ...sess(), filter }),

      // bulk convenience on the bound session
      bulk: async (events) => {
        for (const e of events) {
          switch (e.verb) {
            case "be":          await self._be({ ...sess(), key: e.key, value: e.value }); break;
            case "have":        await self._have({ ...sess(), key: e.key, value: e.value }); break;
            case "at":          await self._at({ ...sess(), key: e.key, value: e.value }); break;
            case "relate":      await self._relate({ ...sess(), key: e.key, value: e.value }); break;
            case "react":       await self._react({ ...sess(), key: e.key, value: e.value }); break;
            case "communicate": await self._communicate({ ...sess(), key: e.key, value: e.value }); break;
            case "do":
            case "do_":         await self._do({ ...sess(), key: e.key, value: e.value }); break;
            default: throw new Error(`Unsupported verb in bulk: ${e.verb}`);
          }
        }
        return true;
      },
    };
  }
}

// Export a singleton instance by default
const cleaker = new CleakerCore();
export default cleaker;

// Also export the class in case advanced consumers want to manage multiple endpoints
export { CleakerCore as Cleaker };