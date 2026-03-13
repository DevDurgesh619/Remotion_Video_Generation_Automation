import { config } from "@remotion/eslint-config-flat";

export default [
  ...config,
  // Ignore auto-generated Remotion component (written by the code-gen pipeline)
  {
    ignores: ["src/GeneratedMotion.tsx"],
  },
  // Disable Remotion-specific rules for Next.js dashboard files
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      "@remotion/warn-native-media-tag": "off",
      "@remotion/non-pure-animation": "off",
    },
  },
];
