<template>
  <div
    ref="carousel"
    class="ssr-carousel"
    v-if="$slots.default() && $slots.default().length"
    :key="$slots.default().length"
    :data-ssrc-id="scopeId"
    @keyup.tab="onTab"
  >
    <span v-html="instanceStyles" />
    <div class="ssr-carousel-slides">
      <div class="ssr-peek-values" ref="peekValues" :style="peekStyles"></div>
      <div
        class="ssr-carousel-mask"
        ref="mask"
        v-on="maskListeners"
        :class="{
          pressing: isMouseDown,
          disabled,
          'no-mask': overflowVisible,
          'not-draggable': noDrag,
        }"
      >
        <CarouselTrack
          ref="track"
          v-bind="{
            dragging,
            gutter,
            isAtLastSlide,
            trackTranslateX,
            slideOrder,
            activeSlides,
            leftPeekingSlideIndex,
            rightPeekingSlideIndex,
          }"
        >
          <template #default>
            <slot></slot>
          </template>

          <template v-if="hasPeekClones" #clones>
            <slot></slot>
          </template>
        </CarouselTrack>
      </div>
      <CarouselArrows
        v-if="showArrows"
        v-bind="{ index: indexValue, pages, shouldLoop }"
        @back="back"
        @next="next"
      >
        <template #back="props">
          <slot name="back-arrow" v-bind="props"></slot>
        </template>
        <template #next="props">
          <slot name="next-arrow" v-bind="props"></slot>
        </template>
      </CarouselArrows>
      <CarouselDots v-if="showDots" v-bind="{ boundedIndex, pages }" @goto="gotoDot">
        <template #dot="props">
          <slot name="dot" v-bind="props"></slot>
        </template>
      </CarouselDots>
      <div class="ssr-carousel-visually-hidden" aria-live="polite" aria-atomic="true">
        {{ currentSlideMessage }}
      </div>
    </div>
  </div>
</template>
<script setup>
import { useCore } from '../lib/core'

import CarouselArrows from './CarouselArrows.vue'
import CarouselDots from './CarouselDots.vue'
import CarouselTrack from './CarouselTrack.vue'

import { toRefs, ref, computed, useSlots } from 'vue'

const slots = useSlots()
const carousel = ref()
const track = ref()
const mask = ref()
const peekValues = ref()

const indexValue = ref(0)
const currentX = ref(0)
const targetX = ref(0)
const usingKeyboard = ref(false)
const contentDragPrevented = ref(false)
const viewportWidth = ref(null)
const carouselWidth = ref(null)
const gutterWidth = ref(0)
const pressing = ref(false)
const dragging = ref(false)
const isTouchDrag = ref(false)
const startPointer = ref(null)
const lastPointer = ref(null)
const dragVelocity = ref(null)
const dragDirectionRatio = ref(null)
const hovered = ref(false)
const windowVisible = ref(true)
const slideOrder = ref([])
const clones = ref([])
const peekLeftPx = ref(0)
const peekRightPx = ref(0)
const tweening = ref(false)
const rafId = ref(null)
const measuredTrackWidth = ref(0)
const autoPlayInterval = ref(null)
const isMouseDown = ref(false)
const hasMoved = ref(false)
const movementThreshold = 10 // Minimum movement to trigger dragging

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0,
  },

  showArrows: {
    type: Boolean,
    required: false,
    default: false,
  },

  showDots: {
    type: Boolean,
    required: false,
    default: false,
  },

  autoplayDelay: {
    type: Number,
    default: 0,
  },

  pauseOnFocus: {
    type: Boolean,
    default: true,
  },

  boundaryDampening: {
    type: Number,
    default: 0.6,
  },

  dragAdvanceRatio: {
    type: Number,
    default: 0.33,
  },

  verticalDragTreshold: {
    type: Number,
    default: 1,
  },

  noDrag: {
    type: Boolean,
  },

  feather: {
    type: [Boolean, String, Number],
    default: false,
  },

  gutter: {
    type: Number,
    default: 20,
  },

  loop: {
    type: Boolean,
    default: false,
  },

  center: {
    type: Boolean,
    default: false,
  },

  paginateBySlide: {
    type: Boolean,
    default: false,
  },

  peekGutter: {
    type: Boolean,
    default: false,
  },

  peek: {
    type: [Number, String],
    default(rawProps) {
      if (!rawProps.peekGutter) return 0
      return `calc(${rawProps.gutter} - 1px)`
    },
  },

  peekLeft: {
    type: [Number, String],
    default(rawProps) {
      return rawProps.peek
    },
  },

  peekRight: {
    type: [Number, String],
    default(rawProps) {
      return rawProps.peek
    },
  },

  matchPeekWhenDisabled: {
    type: Boolean,
    default: true,
  },

  overflowVisible: {
    type: Boolean,
    default: false,
  },

  responsive: {
    type: Array,
    default: () => [],
  },

  slidesPerPage: {
    type: Number,
    default: 1,
  },

  tweenDampening: {
    type: Number,
    default: 0.12,
  },

  tweenInertia: {
    type: Number,
    default: 3,
  },

  offsetLastSlide: {
    type: Number,
    default: 2
  }
})

const emit = defineEmits([
  'update:modelValue',
  'tween:start',
  'tween:end',
  'drag:start',
  'drag:end',
  'change',
  'release',
  'press',
])

const watchesHover = computed(() => {
  return props.autoplayDelay > 0
})

const {
  currentSlideMessage,
  isAtLastSlide,
  onTab,
  autoplayPaused,
  autoplayStart,
  autoplayStop,
  autoplayNext,
  pageWidth,
  trackWidth,
  lastPageWidth,
  endX,
  isOutOfBounds,
  onResize,
  makeBreakpointSlideWidthStyle,
  makeSlideWidthCalc,
  dragIndex,
  fractionalIndex,
  isVerticalDrag,
  preventVerticalScroll,
  stopEvent,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  onMouseLeave,
  getPointerCoords,
  applyXBoundaries,
  applyBoundaryDampening,
  preventContentDrag,
  makeBreakpointFeatheringStyle,
  isFocused,
  windowHidden,
  onEnter,
  onLeave,
  updateVisibility,
  makeBreakpointSlideGutterStyle,
  shouldLoop,
  trackLoopOffset,
  slidesCount,
  rightMostSlideIndex,
  slides,
  disabled,
  currentSlideIndex,
  boundedIndex,
  getXForIndex,
  activeSlides,
  makeBreakpointTrackTransformStyle,
  capturePeekingMeasurements,
  instanceStyles,
  makeBreakpointDisablingRules,
  startTweening,
  isVariableWidth,
  captureTrackWidth,
  makeMediaQuery,
  tweenToX,
  tweenToTarget,
  tweenToStop,
  stopTweening,
  isBreakpointActive,
  autoUnit,
  getResponsiveValue,
  makeBreakpointStyles,
  hashString,
  responsiveRules,
  scopeId,
  isDisabledAtBreakpoint,
  scopeSelector,
  currentResponsiveBreakpoint,
  currentSlidesPerPage,
  peekStyles,
  rightPeekingSlideIndex,
  combinedPeek,
  hasRightPeekClone,
  leftMostSlideIndex,
  leftPeekingSlideIndex,
  hasPeekClones,
  hasPeekPrerequisites,
  hasLeftPeekClone,
  applyIndexBoundaries,
  pages,
  makeIncompletePageOffset,
  next,
  jumpToIndex,
  tweenToIndex,
  back,
  gotoDot,
  goto,
  gotoEnd,
  gotoStart,
  getDefaultSlides,
  makeBreakpointSlideOrderStyle,
  setSlideOrder,
  currentIncompletePageOffset,
} = useCore({
  carousel,
  track,
  mask,
  peekValues,
  emit,
  props,
  slots,
  watchesHover,
  indexValue,
  currentX,
  targetX,
  usingKeyboard,
  contentDragPrevented,
  viewportWidth,
  carouselWidth,
  gutterWidth,
  pressing,
  isMouseDown,
  hasMoved,
  movementThreshold,
  dragging,
  isTouchDrag,
  startPointer,
  lastPointer,
  dragVelocity,
  dragDirectionRatio,
  hovered,
  windowVisible,
  slideOrder,
  clones,
  peekLeftPx,
  peekRightPx,
  tweening,
  rafId,
  measuredTrackWidth,
  autoPlayInterval,
})

const trackTranslateX = computed(() => {
  if (!(carouselWidth.value && !disabled.value)) return

  const offset = currentX.value + trackLoopOffset.value + peekLeftPx.value

  if (isAtLastSlide.value) {
    return offset - props.offsetLastSlide
  }

  return offset
})

const maskListeners = computed(() => {
  if (disabled.value) return {};

  const listeners = {};

  if (!props.noDrag) {
    Object.assign(listeners, {
      mousedown: onPointerDown,
      touchstart: onPointerDown,
      mousemove: onPointerMove,
      mouseleave: onMouseLeave,
      mouseup: onPointerUp,
      touchmove: onPointerMove,
      touchend: onPointerUp,
    });
  }

  if (watchesHover.value) {
    Object.assign(listeners, {
      mouseenter: onEnter,
      mouseleave: onLeave,
    });
  }

  return listeners;
});


</script>

<style lang="scss">
.ssr-carousel {
  touch-action: pan-y;

  * {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    box-sizing: border-box;

    &:before,
    &:after {
      box-sizing: border-box;
    }
  }
}

.ssr-carousel-slides {
  position: relative;
}

.ssr-peek-values {
  position: absolute;
}

.ssr-carousel-mask {
  position: relative;

  &:not(.no-mask) {
    overflow: hidden;
  }

  &:not(.disabled):not(.not-draggable) {
    cursor: grab;
  }

  &:not(.disabled):not(.not-draggable).pressing {
    cursor: grabbing;
  }
}

.ssr-carousel-visually-hidden {
  border: 0;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  width: 1px;
  white-space: nowrap;
}
</style>
