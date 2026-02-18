import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  // @ts-expect-error — ogImage types are provided by nuxt-og-image (bundled in Docus)
  ogImage: {
    compatibility: {
      runtime: {
        resvg: false,
      },
    },
  },
});
