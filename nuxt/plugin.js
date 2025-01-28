import { defineNuxtPlugin } from '#app'
import Carousel from '../src/components/SSRCarousel.vue'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('SSRCarousel', Carousel)
})
