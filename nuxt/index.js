import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: '@chahindb7/vue3-ssr-carousel',
    configKey: '@chahindb7/vue3-ssr-carousel',
    compatibility: {
      nuxt: '>=3.0.0'
    }
  },
  defaults: {},
  setup() {
    const { resolve } = createResolver(import.meta.url)

    addPlugin(resolve('./plugin.js'))
  }
})
