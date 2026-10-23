// Synthetic local HTTP fixtures, never live records or messages.
module.exports = () => {
  const base = require("../notes-browser/fixtures.cjs")();
  const client = {
    id: "00000000-0000-4000-8000-000000000002",
    first_name: "Jordan",
    last_name: "Lee",
    email: "jordan@example.test",
    phone: "+15555550123",
    property_address: "123 Example Lane",
    budget: 300000,
  };
  const state = {
    partners: [],
    reports: [],
    fail: false,
    malformedRates: false,
  };
  return {
    state,
    reset() {
      state.partners = [];
      state.reports = [];
      state.fail = false;
      state.malformedRates = false;
      base.reset();
    },
    async handle(req, res, url) {
      if (url.pathname === "/api/mortgage/market-rates") {
        const { fixture } = require("../campaign-audit/harness.cjs");
        const rates = fixture()
          .load("lib/mortgage/market-rates")
          .buildMarketRatesFromObservations(
            [
              { date: "2026-09-03", rate30: 6.6, rate15: 5.8 },
              { date: "2026-09-10", rate30: 6.5, rate15: 5.7 },
              { date: "2026-09-17", rate30: 6.55, rate15: 5.75 },
              { date: "2026-09-24", rate30: 6.45, rate15: 5.65 },
              { date: "2026-10-01", rate30: 6.5, rate15: 5.7 },
              { date: "2026-10-08", rate30: 6.4, rate15: 5.6 },
              { date: "2026-10-15", rate30: 6.45, rate15: 5.65 },
              { date: "2026-10-22", rate30: 6.4, rate15: 5.6 },
            ],
            "2026-10-23T12:00:00Z",
            Number(url.searchParams.get("historyMonths")) || 6,
          );
        rates.disclaimer =
          "Synthetic QA observations only. No live rate data was used in these screenshots.";
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(state.malformedRates ? {} : rates));
        return true;
      }

      if (
        /^\/api\/contacts\/[^/]+\/tasks$/.test(url.pathname) &&
        req.method === "GET"
      ) {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ success: true, tasks: [] }));
        return true;
      }
      if (!url.pathname.startsWith("/api/financing/"))
        return base.handle(req, res, url);
      const send = (data, status = 200) => {
        res.statusCode = status;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ success: status === 200, data }));
        return true;
      };
      if (state.fail) return send({}, 503);
      let body = null;
      if (req.method === "POST") {
        let raw = "";
        for await (const c of req) raw += c;
        body = JSON.parse(raw);
      }
      if (url.pathname.endsWith("/context"))
        return send({
          contacts: [client],
          branding: {
            name: "Synthetic Realtor",
            phone: "555-0100",
            brokerage: "Test Realty",
            headshot: "",
            jobTitle: "Agent",
          },
        });
      if (url.pathname.endsWith("/partners")) {
        if (body) {
          const p = { ...body, id: body.id || crypto.randomUUID() };
          state.partners.push(p);
          return send({ partner: p });
        }
        return send({ partners: state.partners });
      }
      if (url.pathname.endsWith("/reports")) {
        if (body) {
          state.reports.push({
            id: body.id,
            created_at: new Date().toISOString(),
            payload: {
              ...body,
              result: { title: "Seller Net Sheet", total: 142500 },
              branding: { name: "Synthetic Realtor" },
              partners: [],
            },
          });
          return send({ report: state.reports.at(-1) });
        }
        return send({ reports: state.reports });
      }
      return send({});
    },
  };
};
