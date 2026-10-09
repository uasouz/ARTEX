import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "CIRDAN ARTEX",
  version: packageJson.version,
  copyright: `© ${currentYear}, CIRDAN.`,
  meta: {
    title: "CIRDAN ARTEX — Autonomous Security & Penetration Testing Platform",
    description: "LLM-driven autonomous red teaming and security testing platform by CIRDAN",
  },
};
