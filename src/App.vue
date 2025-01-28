<template>
  <div class="parent">
    <SSRCarousel
      class="m-top"
      :slides-per-page="4"
      :autoplay-delay="3"
      paginate-by-slide
      center
      :responsive="[
        {
          maxWidth: 1280,
          slidesPerPage: 3,
        },
        {
          maxWidth: 1024,
          slidesPerPage: 2,
        },
        {
          maxWidth: 767,
          slidesPerPage: 1,
        },
      ]"
    >
      <Slide :index="item" v-for="(item, index) in [1, 2, 3, 4, 5]" :key="index" />
    </SSRCarousel>
  </div>
</template>

<script setup>
import SSRCarousel from '@/components/SSRCarousel.vue'

</script>

<style lang="scss" scoped>
.parent {
  margin: 2rem auto;
  padding: 0 20px;
  color: white;
}
</style>
