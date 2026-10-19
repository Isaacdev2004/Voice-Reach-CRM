import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/** Next.js 16+ — use ESLint CLI directly (`next lint` was removed). */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "stitch_voicereach_enterprise_crm/**",
      "proposals/**",
    ],
  },
  ...nextCoreWebVitals,
  {
    // React Compiler rules — legacy codebase; tighten incrementally post-symposium.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
];

export default eslintConfig;
