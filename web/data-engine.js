(function (root) {
  "use strict";
  const YEARS = [2009, 2012, 2015, 2018, 2021, 2024];
  const PRESIDENTIAL = [2012, 2018, 2024];
  const rate = (counts, field = "sv") => counts.ln > 0 ? counts[field] / counts.ln * 100 : null;
  const difference = (a, b) => a === null || b === null ? null : a - b;
  const empty = () => ({ ln: 0, sv: 0, nv: 0, ns: 0, rows: 0 });
  const smallBase = metric => [metric.counts, metric.first, metric.young, metric.presidential, metric.intermediate, metric.women, metric.men].filter(Boolean).some(counts => counts.ln > 0 && counts.ln < 100);

  class DataEngine {
    constructor(data) {
      this.data = data;
      this.index = new Map();
      this.cache = new Map();
      for (const row of data.rows) {
        const key = `${row[1]}:${row[0]}`;
        if (!this.index.has(key)) this.index.set(key, []);
        this.index.get(key).push(row);
      }
    }

    sum(criteria = {}) {
      const state = Number(criteria.state || 0);
      const years = criteria.years || [Number(criteria.year || 2024)];
      const section = criteria.section ?? "all";
      const sex = criteria.sex ?? "all";
      const age = criteria.age ?? "all";
      const ages = Array.isArray(age) ? age : age === "all" ? null : [Number(age)];
      const cacheKey = JSON.stringify([state, years, section, sex, ages]);
      if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
      const result = empty();
      for (const year of years) {
        for (const row of this.index.get(`${state}:${year}`) || []) {
          if (section !== "all" && row[2] !== Number(section)) continue;
          if (sex !== "all" && row[3] !== Number(sex)) continue;
          if (ages && !ages.includes(row[4])) continue;
          result.ln += row[5];
          result.sv += row[6];
          result.nv += row[7];
          result.ns += row[8];
          result.rows += 1;
        }
      }
      if (this.cache.size > 5000) this.cache.clear();
      Object.freeze(result);
      this.cache.set(cacheKey, result);
      return result;
    }

    ageDrop(criteria) {
      const first = this.sum({ ...criteria, age: 0 });
      const young = this.sum({ ...criteria, age: [1, 2] });
      const firstRate = rate(first);
      const youngRate = rate(young);
      let recovery = null;
      if (firstRate !== null && youngRate !== null) {
        for (let age = 3; age < 8; age += 1) {
          const value = rate(this.sum({ ...criteria, age }));
          if (value !== null && value >= firstRate) {
            recovery = this.data.ages[age];
            break;
          }
        }
      }
      return { value: difference(firstRate, youngRate), first, young, firstRate, youngRate, recovery };
    }

    electionGap(criteria) {
      const presidential = this.sum({ ...criteria, years: PRESIDENTIAL });
      const intermediate = this.sum({ ...criteria, years: YEARS.filter(year => !PRESIDENTIAL.includes(year)) });
      return { value: difference(rate(presidential), rate(intermediate)), presidential, intermediate };
    }

    genderGap(criteria) {
      const women = this.sum({ ...criteria, years: [2024], sex: 1 });
      const men = this.sum({ ...criteria, years: [2024], sex: 0 });
      return { value: difference(rate(women), rate(men)), women, men };
    }

    effective(filters) {
      const result = { state: filters.state, year: Number(filters.year), sex: filters.sex, section: filters.section, age: filters.age };
      if (filters.mode === "age") result.age = "all";
      if (filters.mode === "election") result.years = YEARS;
      if (filters.mode === "gender") {
        result.year = 2024;
        result.sex = "all";
      }
      return result;
    }

    metric(filters, state = filters.state) {
      const criteria = this.effective({ ...filters, state });
      const counts = this.sum(criteria);
      if (filters.mode === "age") return { ...this.ageDrop(criteria), counts };
      if (filters.mode === "election") return { ...this.electionGap(criteria), counts };
      if (filters.mode === "gender") return { ...this.genderGap(criteria), counts };
      return { value: rate(counts), counts };
    }

    special(state, sex = "all") {
      const counts = [0, 0];
      const rows = [0, 0];
      for (const row of this.data.special) {
        if (Number(state) && row[0] !== Number(state)) continue;
        if (sex !== "all" && row[1] !== Number(sex)) continue;
        counts[row[2]] += row[3];
        rows[row[2]] += 1;
      }
      return this.data.modalities.map((name, index) => ({ name, count: counts[index], present: rows[index] > 0 }));
    }
  }
  const api = { DataEngine, rate, difference, smallBase, YEARS, PRESIDENTIAL };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CCPC = api;
})(typeof globalThis === "undefined" ? window : globalThis);
