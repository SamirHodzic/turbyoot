# Tiny Node Framework (TypeScript scaffold)

## Setup

```bash
# 1. install dev deps
npm install

# 2. dev run (ts-node)
npm run dev

# 3. build and run
npm run build
npm start
```

## Benchmark hint
Install `autocannon` globally or as dev-dep and compare:

```bash
# install globally
npm i -g autocannon

# run benchmark
autocannon -c 100 -d 10 http://localhost:3000/hello
```

Try the scaffold vs a minimal Express endpoint to see baseline differences. Focus optimizations where the bottlenecks are.
```

---

## Notes & next steps
- This scaffold keeps everything in plain TypeScript and Node built-ins; no runtime deps.
- Later improvements you can do next: switch to a radix/trie router, add streaming body parser (for uploads), add typed route params, add small plugin API, and add tests.
- If you want, I can now:
  - convert this into a small npm package structure with unit tests
  - replace the simple regex-based matcher with a radix/trie router (smaller memory & faster for many routes)
  - add TypeScript types that generate OpenAPI skeletons from route defs

---

Happy hacking — open the files above and tell me what you want me to generate next (radix router, tests, or OpenAPI emitter).