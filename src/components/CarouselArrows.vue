<template>
  <div class="ssr-carousel-arrows">
    <button
      class="ssr-carousel-back-button"
      aria-label="Back"
      :disabled="backDisabled"
      @click="emit('back')"
    >
      <slot name="back" :disabled="backDisabled">
        <span class="ssr-carousel-back-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-narrow-left"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M5 12l14 0" />
            <path d="M5 12l4 4" />
            <path d="M5 12l4 -4" />
          </svg>
        </span>
      </slot>
    </button>
    <button
      class="ssr-carousel-next-button"
      aria-label="Next"
      :disabled="nextDisabled"
      @click="$emit('next')"
    >
      <slot name="next" :disabled="nextDisabled">
        <span class="ssr-carousel-next-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-narrow-right"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M5 12l14 0" />
            <path d="M15 16l4 -4" />
            <path d="M15 8l4 4" />
          </svg>
        </span>
      </slot>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  index: {
    type: Number,
  },
  pages: {
    type: Number,
  },
  shouldLoop: {
    type: Boolean,
  },
})

const emit = defineEmits(['back', 'next'])

const backDisabled = computed(() => {
  return props.index === 0 && !props.shouldLoop
})

const nextDisabled = computed(() => {
  return false
})
</script>

<style lang="scss">
@mixin triangle($width, $height, $color, $direction) {
  // Base styles for all triangles
  border-style: solid;
  height: 0;
  width: 0;
  background: 0;

  // Cardinal Directions - can't be scalene this way
  @if ($direction == 'top') {
    border-color: transparent transparent $color transparent;
    border-width: 0 calc($width/2) $height calc($width/2);
  }
  @if ($direction == 'bottom') {
    border-color: $color transparent transparent transparent;
    border-width: $height calc($width/2) 0 calc($width/2);
  }
  @if ($direction == 'right') {
    border-color: transparent transparent transparent $color;
    border-width: calc($height/2) 0 calc($height/2) $width;
  }
  @if ($direction == 'left') {
    border-color: transparent $color transparent transparent;
    border-width: calc($height/2) $width calc($height/2) 0;
  }
  // Ordinal Directions - can be scalene this way!
  @if ($direction == 'top-left') {
    border-color: $color transparent transparent transparent;
    border-width: $height $width 0 0;
  }
  @if ($direction == 'top-right') {
    border-color: transparent $color transparent transparent;
    border-width: 0 $width $height 0;
  }
  @if ($direction == 'bottom-left') {
    border-color: transparent transparent transparent $color;
    border-width: $height 0 0 $width;
  }
  @if ($direction == 'bottom-right') {
    border-color: transparent transparent $color transparent;
    border-width: 0 0 $height $width;
  }
}

@mixin circle($size, $color: null) {
  border-radius: 50%;
  height: $size;
  width: $size;
  @if ($color != null) {
    background: $color;
  }
}

.ssr-carousel-back-button,
.ssr-carousel-next-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: inline-block;
  appearance: none;
  background: none;
  color: inherit;
  border: none;
  padding: 0;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
}
.ssr-carousel-back-button {
  left: 2%;
}
.ssr-carousel-next-button {
  right: 2%;
}
.ssr-carousel-back-icon,
.ssr-carousel-next-icon {
  @include circle(42px, rgba(0, 0, 0, 0.5));
  display: flex;
  color: white;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}
[disabled] > .ssr-carousel-back-icon,
[disabled] > .ssr-carousel-next-icon {
  opacity: 0.1;
  cursor: default;
}
:not([disabled]) > .ssr-carousel-back-icon,
:not([disabled]) > .ssr-carousel-next-icon {
  opacity: 0.5;
}
@media (hover: hover) {
  :not([disabled]) > .ssr-carousel-back-icon:hover,
  :not([disabled]) > .ssr-carousel-next-icon:hover {
    opacity: 0.85;
  }
}

:not([disabled]) > .ssr-carousel-back-icon:active.active,
:not([disabled]) > .ssr-carousel-next-icon:active.active {
  opacity: 1;
}
</style>
