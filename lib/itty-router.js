// itty-router v4.0.27
// https://github.com/kwhitley/itty-router
var Router = ({ base: e = "", routes: r = [] } = {}) => ({
  __proto__: new Proxy({}, {
    get: (a, o, t) => (s, ...i) => (r.push([o.toUpperCase(), RegExp(`^${(e + s).replace(/(\/?)\*/g, "($1.*)?").replace(/\/$/, "").replace(/:(\w+)/g, "(?<$1>[^/]+)")}$`), i]), t)
  }),
  routes: r,
  async handle(e, ...a) {
    let o, t, s = new URL(e.url);
    e.query = Object.fromEntries(s.searchParams);
    for (var [i, c, l] of r)
      if ((i === e.method || "ALL" === i) && (t = s.pathname.match(c))) {
        e.params = t.groups;
        for (var n of l)
          if (void 0 !== (o = await n(e, ...a))) return o
      }
  }
});

export {
  Router
};

