import { ref, watch, onMounted, computed, onBeforeUnmount, Fragment } from 'vue'

const passive = { passive: true } // Code Dragging
const notPassive = { passive: false } // Code Dragging

// Code Pagination
const getSlotChildrenText = (node) => {
  if (!node.children || typeof node.children === 'string') return node.children || ''
  else if (Array.isArray(node.children)) return getSlotChildrenText(node.children)
  else if (node.children.default) return getSlotChildrenText(node.children.default())
}

export function useCore({ carousel, track, mask, peekValues, emit, props, slots, watchesHover, indexValue, currentX, targetX, usingKeyboard, contentDragPrevented, viewportWidth, carouselWidth, gutterWidth, pressing, dragging, isTouchDrag, startPointer, lastPointer, dragVelocity, dragDirectionRatio, hovered, windowVisible, slideOrder, clones, peekLeftPx, peekRightPx, tweening, rafId, measuredTrackWidth, autoPlayInterval, isMouseDown, hasMoved, movementThreshold }) {
  onMounted(() => {
    // Code Dimensions
    // -------------------------------------------------------
    onResize()
    window.addEventListener('resize', onResize)
    // -------------------------------------------------------

    // Code Focus
    // -------------------------------------------------------
    if (watchesHover.value) {
      document.addEventListener('visibilitychange', updateVisibility)
    }

    // Code Autoplay
    // -------------------------------------------------------
    autoplayStart()

    // -------------------------------------------------------
  })

  onBeforeUnmount(() => {
    // Code Autoplay
    // -------------------------------------------------------
    autoplayStop()
    // -------------------------------------------------------

    // Code Dimensions
    // -------------------------------------------------------
    window.removeEventListener('resize', onResize)
    // -------------------------------------------------------

    // Code Dragging
    // -------------------------------------------------------
    window.removeEventListener('mousemove', onPointerMove, passive)
    window.removeEventListener('mouseup', onPointerUp, passive)
    window.removeEventListener('mouseleave', onMouseLeave, passive)
    window.removeEventListener('touchmove', onPointerMove, passive)
    window.removeEventListener('touchend', onPointerUp, passive)
    window.removeEventListener('touchmove', onPointerUp, notPassive)
    // -------------------------------------------------------

    // Code Focus
    // -------------------------------------------------------
    if (watchesHover.value) {
      document.removeEventListener('visibilitychange', updateVisibility)
    }
    // -------------------------------------------------------

    // Code Tweening
    // -------------------------------------------------------
    window.cancelAnimationFrame(rafId.value)
    // -------------------------------------------------------
  })

  // ---------------------------------------------------------------------------------------------

  // Code Accessibility
  // -------------------------------------------------------

  const currentSlideMessage = computed(() => {
    return `Item ${boundedIndex.value + 1} of ${pages.value}`
  })

  const isAtLastSlide = computed(() => {
    return boundedIndex.value === pages.value - 1
  })

  function onTab() {
    return (usingKeyboard.value = true)
  }

  // -------------------------------------------------------

  // Code Autoplay
  // -------------------------------------------------------

  const autoplayPaused = computed(() => {
    if (usingKeyboard.value) {
      return true
    }

    if (props.pauseOnFocus) {
      return windowHidden.value || isFocused.value
    }

    return false
  })

  function autoplayStart() {
    if (!props.autoplayDelay) {
      return
    }

    if (!pages.value) {
      return
    }

    autoPlayInterval.value = setInterval(() => {
      if (!autoplayPaused.value) {
        autoplayNext()
      }
    }, props.autoplayDelay * 1000)
  }

  function autoplayStop() {
    clearInterval(autoPlayInterval.value)
  }

  function autoplayNext() {
    if (shouldLoop.value || indexValue.value < pages.value - 1) {
      next()
    } else {
      goto(0)
    }
  }

  // -------------------------------------------------------

  // Code Dimensions
  // -------------------------------------------------------

  const pageWidth = computed(() => {
    return carouselWidth.value - combinedPeek.value
  })

  const slideWidth = computed(() => {
    return pageWidth.value / currentSlidesPerPage.value
  })

  const trackWidth = computed(() => {
    if (isVariableWidth.value) {
      return measuredTrackWidth.value + gutterWidth.value
    } else {
      return slideWidth.value * slidesCount.value
    }
  })

  const lastPageWidth = computed(() => {
    const slidesPerPage = currentSlidesPerPage.value
    let slidesOnLastPage = slidesCount.value % slidesPerPage

    if (slidesOnLastPage === 0) {
      slidesOnLastPage = slidesPerPage
    }

    return slidesOnLastPage * slideWidth.value
  })

  const endX = computed(() => {
    return disabled.value
      ? 0
      : pageWidth.value - trackWidth.value - peekLeftPx.value + peekRightPx.value + 1
  })

  const isOutOfBounds = computed(() => {
    return currentX.value > 0 || currentX.value < endX.value
  })

  function onResize() {
    if (!carousel.value?.nodeType === Node.ELEMENT_NODE) {
      return
    }

    const firstSlide = track.value?.$el.firstElementChild

    if (!firstSlide) {
      return
    }

    gutterWidth.value = parseInt(props.gutter)
    carouselWidth.value = carousel.value?.getBoundingClientRect().width + gutterWidth.value
    viewportWidth.value = window.innerWidth

    capturePeekingMeasurements()

    if (isVariableWidth.value) {
      captureTrackWidth()
    }
  }

  function makeBreakpointSlideWidthStyle(breakpoint) {
    if (isVariableWidth.value) return

    return `
      ${scopeSelector.value} .ssr-carousel-slide {
        width: ${makeSlideWidthCalc(breakpoint)};
      }
    `
  }

  function makeSlideWidthCalc(breakpoint) {
    const isDisabled = isDisabledAtBreakpoint(breakpoint)
    const slidesPerPage = getResponsiveValue('slidesPerPage', breakpoint, props.slidesPerPage)
    const gutter = getResponsiveValue('gutter', breakpoint, props.gutter)

    let peekLeft = getResponsiveValue('peekLeft', breakpoint, props.peekLeft)
    let peekRight = getResponsiveValue('peekRight', breakpoint, props.peekRight)
    if (props.matchPeekWhenDisabled && isDisabled) {
      peekRight = peekLeft
    }

    return `calc(
				${100 / slidesPerPage}% -
				(${autoUnit(peekLeft)} + ${autoUnit(peekRight)}) / ${slidesPerPage} -
				(${autoUnit(gutter)} * ${slidesPerPage - 1}) / ${slidesPerPage}
			)`
  }

  // -------------------------------------------------------

  // Code Dragging
  // -------------------------------------------------------

  const dragIndex = computed(() => {
    if (Math.abs(dragVelocity.value) <= 2) return Math.round(fractionalIndex.value)

    if (dragVelocity.value < 0) return Math.ceil(fractionalIndex.value)

    return Math.floor(fractionalIndex.value)
  })

  const fractionalIndex = computed(() => {
    if (!trackWidth.value) {
      return 0
    }
    let x = currentX.value * -1
    let setIndex = Math.floor(x / trackWidth.value)
    let widthDivisor = props.paginateBySlide ? slideWidth.value : pageWidth.value
    let pageIndex = Math.floor((x - setIndex * trackWidth.value) / widthDivisor)
    let distanceIntoPage = x - setIndex * trackWidth.value - pageIndex * widthDivisor
    let slidesPerPage = currentSlidesPerPage.value
    let remainingSlides = shouldLoop.value
      ? slidesCount.value - pageIndex * slidesPerPage
      : slidesCount.value - (pageIndex + 1) * slidesPerPage

    let isLastPage = remainingSlides <= slidesPerPage
    let _pageWidth = isLastPage ? lastPageWidth.value : widthDivisor
    let pageProgressPercent = distanceIntoPage / _pageWidth

    return pageProgressPercent + setIndex * pages.value + pageIndex
  })

  const isVerticalDrag = computed(() => {
    if (!dragDirectionRatio.value) return false
    return dragDirectionRatio.value < props.verticalDragTreshold
  })

  const preventVerticalScroll = computed(() => {
    return pressing.value && isTouchDrag.value && !isVerticalDrag.value
  })

  function stopEvent(e) {
    e.preventDefault()
  }

  function onPointerDown(pointerEvent) {
    isTouchDrag.value = window.TouchEvent && pointerEvent instanceof TouchEvent;
    startPointer.value = lastPointer.value = getPointerCoords(pointerEvent);
    usingKeyboard.value = false;
    hasMoved.value = false; // Reset movement flag
    isMouseDown.value = true; // Mark the mouse as being held down
  }

  function onPointerMove(pointerEvent) {
    if (!isMouseDown.value) return; // Prevent dragging if the mouse is not held down

    const pointer = getPointerCoords(pointerEvent);
    const distance = Math.sqrt(
      Math.pow(pointer.x - startPointer.value.x, 2) +
      Math.pow(pointer.y - startPointer.value.y, 2)
    );

    if (distance > movementThreshold) {
      hasMoved.value = true; // Mark as moved if threshold exceeded
      if (!pressing.value) {
        pressing.value = true; // Start drag and trigger the watch
      }
      dragging.value = true; // Enable dragging
      dragVelocity.value = pointer.x - lastPointer.value.x;
      targetX.value += dragVelocity.value;
      lastPointer.value = pointer;
      dragDirectionRatio.value = Math.abs(
        (pointer.x - startPointer.value.x) / (pointer.y - startPointer.value.y),
      );
      currentX.value = applyBoundaryDampening(targetX.value);
    }
  }

  function onPointerUp() {
    isMouseDown.value = false; // Mark the mouse as no longer being held down
    if (!hasMoved.value) {
      pressing.value = true; // Mark as a click if no significant movement occurred
      emit('click'); // Emit click event
    } else {
      pressing.value = false; // Reset pressing state if it was a drag
    }
    dragging.value = false; // Stop dragging
    hasMoved.value = false; // Reset movement flag
  }

  function onMouseLeave() {
    pressing.value = false
    dragging.value = false
    hasMoved.value = false
    isMouseDown.value = false
  }

  function getPointerCoords(pointerEvent) {
    return {
      x: pointerEvent.touches?.[0]?.pageX || pointerEvent.pageX,
      y: pointerEvent.touches?.[0]?.pageY || pointerEvent.pageY,
    }
  }

  function applyBoundaryDampening(x) {
    const boundaryBuffer = 50 // Add buffer for boundary conditions
    if (shouldLoop.value) return x
    if (x > boundaryBuffer) return boundaryBuffer // Avoid extreme overshoots
    if (x < endX.value - boundaryBuffer) return endX.value - boundaryBuffer // Adjust lower bounds
    return applyXBoundaries(x)
  }

  function applyXBoundaries(x) {
    if (shouldLoop.value) return x
    return Math.max(endX.value, Math.min(0, x))
  }

  function preventContentDrag() {
    if (contentDragPrevented.value || !track.value) return

    track.value?.$el.querySelectorAll('a, img').forEach((el) => {
      el.addEventListener('dragstart', (e) => {
        e.preventDefault()
      })
    })
    contentDragPrevented.value = true
  }

  // -------------------------------------------------------

  // Code Feathering
  // -------------------------------------------------------

  function makeBreakpointFeatheringStyle(breakpoint) {
    if (isDisabledAtBreakpoint(breakpoint)) return

    let feather = getResponsiveValue('feather', breakpoint, props.feather)

    if (feather === false || feather === null) return

    feather = feather && typeof feather !== 'boolean' ? feather : 20
    feather = autoUnit(feather)

    const cssValue = `
      linear-gradient(to right,
        transparent, black ${feather},
        black calc(100% - ${feather}),
        transparent)
    `

    return `
      ${scopeSelector.value} .ssr-carousel-mask {
        -webkit-mask-image: ${cssValue};
        mask-image: ${cssValue};
      }
    `
  }

  // -------------------------------------------------------

  // Code Focus
  // -------------------------------------------------------

  const isFocused = computed(() => windowVisible.value && hovered.value)
  const windowHidden = computed(() => !windowVisible.value)

  function onEnter() {
    hovered.value = true
  }

  function onLeave() {
    hovered.value = false
  }

  function updateVisibility() {
    windowVisible.value = !document.hidden
  }

  // -------------------------------------------------------

  // Code Gutters
  // -------------------------------------------------------

  function makeBreakpointSlideGutterStyle(breakpoint) {
    const gutter = getResponsiveValue('gutter', breakpoint, props.gutter)

    // Render styles
    return `
        ${scopeSelector.value} .ssr-carousel-slide {
          margin-right: 0;
        }
      `
  }

  // -------------------------------------------------------

  // Code Looping
  // -------------------------------------------------------

  const shouldLoop = computed(() => props.loop && !usingKeyboard.value)

  const currentSlideIndex = computed(() => {
    return Math.floor((currentX.value / slideWidth.value) * -1)
  })

  const trackLoopOffset = computed(() => {
    if (!shouldLoop.value) return 0
    let offsetSlideCount = currentSlideIndex.value
    if (hasLeftPeekClone.value) offsetSlideCount -= 1
    return offsetSlideCount * slideWidth.value
  })

  const leftMostSlideIndex = computed(() => {
    return slideOrder.value.findIndex((index) => index === 0)
  })

  const rightMostSlideIndex = computed(() => {
    return slideOrder.value.findIndex((index) => index === slideOrder.value.length - 1)
  })

  function setSlideOrder() {
    let indices = [...Array(slidesCount.value).keys()]
    const count = indices.length

    if (props.center) {
      const split = Math.floor(currentSlidesPerPage.value / 2)
      indices = [...indices.slice(split), ...indices.slice(0, split)]
    }

    if (shouldLoop.value) {
      const split = (count - currentSlideIndex.value) % count
      indices = [...indices.slice(split), ...indices.slice(0, split)]
    }

    slideOrder.value = indices
  }

  function makeBreakpointSlideOrderStyle(breakpoint) {
    if (!props.center) return
    const slidesPerPage = getResponsiveValue('slidesPerPage', breakpoint, props.slidesPerPage)
    const split = Math.floor(slidesPerPage / 2)
    const rules = []
    for (let i = 0; i <= slidesCount.value; i++) {
      rules.push(`
        ${scopeSelector.value} .ssr-carousel-slide:nth-child(${i + 1}) {
          order: ${(i + split) % slidesCount.value};
        }
      `)
    }
    return rules.join('')
  }

  // -------------------------------------------------------

  // Code Pagination
  // -------------------------------------------------------

  indexValue.value = props.modelValue

  const pages = computed(() => {
    if (props.paginateBySlide) {
      if (shouldLoop.value) {
        return slidesCount.value
      }
      return slidesCount.value - currentSlidesPerPage.value + 1
    }
    return Math.ceil(slidesCount.value / currentSlidesPerPage.value)
  })

  const disabled = computed(() => {
    if (isVariableWidth.value) {
      return Math.round(trackWidth) <= Math.round(carouselWidth.value)
    }
    return slidesCount.value <= currentSlidesPerPage.value
  })

  const slides = computed(() => {
    const defaultSlides = slots.default ? slots.default() : []
    return (
      getDefaultSlides(defaultSlides) ||
      defaultSlides.filter((vnode) => !getSlotChildrenText(vnode))
    )
  })

  const slidesCount = computed(() => {
    return slides.value.length
  })

  const boundedIndex = computed(() => {
    const boundedIndex = indexValue.value % pages.value
    if (boundedIndex < 0) {
      return pages.value + boundedIndex
    } else {
      return boundedIndex
    }
  })

  const currentIncompletePageOffset = computed(() => {
    return makeIncompletePageOffset(indexValue.value)
  })

  const activeSlides = computed(() => {
    if (isVariableWidth.value) {
      return [...Array(slidesCount.value).keys()]
    }

    let start = props.paginateBySlide
      ? boundedIndex.value
      : boundedIndex.value * currentSlidesPerPage.value

    if (!shouldLoop.value) {
      start -= boundedIndex.value % currentSlidesPerPage.value
    }
    const results = []
    for (let i = start; i < start + currentSlidesPerPage.value; i++) {
      results.push(i)
    }

    return results.reduce((slides, offset) => {
      if (shouldLoop.value) {
        slides.push(offset % slidesCount.value)
      } else if (offset < slidesCount.value) {
        slides.push(offset)
      }
      return slides
    }, [])
  })

  function getDefaultSlides(vnodes) {
    return vnodes.reduce((acc, vnode) => {
      if (vnode.type === Fragment) {
        if (Array.isArray(vnode.children)) {
          acc = [...acc, ...getDefaultSlides(vnode.children)]
        }
      } else {
        acc.push(vnode)
      }
      return acc
    }, [])
  }

  function next() {
    if (isAtLastSlide.value && !shouldLoop.value) {
      return goto(0)
    }

    goto(indexValue.value + 1)
  }

  function back() {
    goto(indexValue.value - 1)
  }

  function gotoDot(dotIndex) {
    goto(dotIndex - boundedIndex.value + indexValue.value)
  }

  function goto(index) {
    indexValue.value = applyIndexBoundaries(index)
    tweenToIndex(indexValue.value)
  }

  function gotoStart() {
    if (isVariableWidth.value) {
      tweenToX(0)
    } else {
      goto(0)
    }
  }

  function gotoEnd() {
    if (isVariableWidth.value) {
      tweenToX(endX.value)
    } else {
      goto(pages.value - 1)
    }
  }

  function tweenToIndex(index) {
    targetX.value = getXForIndex(index)
    startTweening()
  }

  function jumpToIndex(index) {
    currentX.value = targetX.value = getXForIndex(index)
  }

  function getXForIndex(index) {
    let x = props.paginateBySlide ? index * slideWidth.value * -1 : index * pageWidth.value * -1

    x += makeIncompletePageOffset(index)
    return Math.round(applyXBoundaries(x))
  }

  function makeIncompletePageOffset(index) {
    if (!(shouldLoop.value && !props.paginateBySlide)) {
      return 0
    }
    const incompleteWidth = pageWidth.value - lastPageWidth.value
    return Math.floor(index / pages.value) * incompleteWidth
  }

  function applyIndexBoundaries(index) {
    return shouldLoop.value ? index : Math.max(0, Math.min(pages.value - 1, index))
  }

  // -------------------------------------------------------

  // Code Peeking
  // -------------------------------------------------------

  const hasPeekClones = computed(() => hasLeftPeekClone.value || hasRightPeekClone.value)

  const hasPeekPrerequisites = computed(() => shouldLoop.value && slidesCount.value > 1)

  const hasLeftPeekClone = computed(() => hasPeekPrerequisites.value && props.peekLeft)

  const hasRightPeekClone = computed(() => hasPeekPrerequisites.value && props.peekRight)

  const leftPeekingSlideIndex = computed(() => {
    if (hasLeftPeekClone.value) {
      return rightMostSlideIndex.value
    }

    return leftMostSlideIndex.value
  })

  const rightPeekingSlideIndex = computed(() => {
    if (hasRightPeekClone.value) {
      return leftMostSlideIndex.value
    }

    return rightMostSlideIndex.value
  })

  const combinedPeek = computed(() => peekLeftPx.value + peekRightPx.value)

  const peekStyles = computed(() => {
    const breakpoint = currentResponsiveBreakpoint.value
    return {
      left: autoUnit(getResponsiveValue('peekLeft', breakpoint, props.peekLeft)),
      right: autoUnit(getResponsiveValue('peekRight', breakpoint, props.peekRight)),
    }
  })

  function capturePeekingMeasurements() {
    if (!peekValues.value) return
    const styles = getComputedStyle(peekValues.value)
    peekLeftPx.value = parseInt(styles.left)
    peekRightPx.value = parseInt(styles.right)
  }

  function makeBreakpointTrackTransformStyle(breakpoint) {
    if (isDisabledAtBreakpoint(breakpoint)) return

    const peekLeftValue = getResponsiveValue('peekLeft', breakpoint, props.peekLeft)
    let rule
    if (!hasLeftPeekClone.value) {
      rule = `transform: translateX(${autoUnit(peekLeftValue.value)});`
    } else {
      const gutter = getResponsiveValue('gutter', breakpoint, props.gutter)
      rule = `transform: translateX(calc(${autoUnit(
        peekLeftValue.value,
      )} - (${makeSlideWidthCalc(breakpoint)} + ${autoUnit(gutter.value)})));`
    }

    return `${scopeSelector.value} .ssr-carousel-track { ${rule} }`
  }

  // -------------------------------------------------------

  // Code Responsive
  // -------------------------------------------------------

  const scopeId = computed(() => {
    return hashString(slidesCount.value + '|' + JSON.stringify(props))
  })

  const responsiveRules = computed(() =>
    props.responsive.map((breakpoint) => ({
      ...breakpoint,
      mediaQuery: makeMediaQuery(breakpoint),
      active: isBreakpointActive(breakpoint),
      peekLeft:
        breakpoint.peekLeft || breakpoint.peek || (breakpoint.gutter && breakpoint.peekGutter),
      peekRight:
        breakpoint.peekRight || breakpoint.peek || (breakpoint.gutter && breakpoint.peekGutter),
    })),
  )

  const currentSlidesPerPage = computed(() =>
    getResponsiveValue('slidesPerPage', currentResponsiveBreakpoint.value, props.slidesPerPage),
  )

  const currentResponsiveBreakpoint = computed(() => {
    const reversedRules = [...responsiveRules.value].reverse()
    const match = reversedRules.find(({ active }) => active)

    if (match) return match

    return {
      slidesPerPage: props.slidesPerPage,
      gutter: props.gutter,
      peekLeft: props.peekLeft || props.peek || (props.gutter && props.peekGutter),
      peekRight: props.peekRight || props.peek || (props.gutter && props.peekGutter),
      feather: props.feather,
    }
  })

  const scopeSelector = computed(() => {
    return `[data-ssrc-id='${scopeId.value}']`
  })

  const instanceStyles = computed(() => {
    return (
      '<style>' +
      makeBreakpointStyles(props) +
      responsiveRules.value
        .map((breakpoint) => {
          return `@media ${breakpoint.mediaQuery} {
                ${makeBreakpointStyles(breakpoint)}
              }`
        })
        .join(' ') +
      '</style>'
    )
  })

  function makeMediaQuery(breakpoint) {
    const rules = []
    if (breakpoint.maxWidth) rules.push(`(max-width: ${breakpoint.maxWidth}px)`)
    if (breakpoint.minWidth) rules.push(`(min-width: ${breakpoint.minWidth}px)`)
    return rules.join(' and ')
  }

  function makeBreakpointStyles(breakpoint) {
    return [
      makeBreakpointDisablingRules(breakpoint),
      makeBreakpointFeatheringStyle(breakpoint),
      makeBreakpointTrackTransformStyle(breakpoint),
      makeBreakpointSlideWidthStyle(breakpoint),
      makeBreakpointSlideGutterStyle(breakpoint),
      makeBreakpointSlideOrderStyle(breakpoint),
    ].join(' ')
  }

  function makeBreakpointDisablingRules(breakpoint) {
    const slidesPerPage = getResponsiveValue('slidesPerPage', breakpoint, props.slidesPerPage)

    if (slidesCount.value <= slidesPerPage) {
      return `
            ${scopeSelector.value} .ssr-carousel-track { justify-content: center; }
            ${scopeSelector.value} .ssr-carousel-arrows,
            ${scopeSelector.value} .ssr-carousel-dots { display: none; }
          `
    } else {
      return `
            ${scopeSelector.value} .ssr-carousel-track { justify-content: start; }
            ${scopeSelector.value} .ssr-carousel-arrows { display: block; }
            ${scopeSelector.value} .ssr-carousel-dots { display: flex; }
          `
    }
  }

  function isDisabledAtBreakpoint(breakpoint) {
    const slidesPerPage = getResponsiveValue('slidesPerPage', breakpoint, props.slidesPerPage)
    return slidesCount.value <= slidesPerPage
  }

  function isBreakpointActive(breakpoint) {
    if (!viewportWidth.value) return false
    if (breakpoint.maxWidth && viewportWidth.value > breakpoint.maxWidth) return false
    return !(breakpoint.minWidth && viewportWidth.value < breakpoint.minWidth)
  }

  function getResponsiveValue(property, breakpoint, returnValue) {
    if (breakpoint[property] !== undefined) {
      return breakpoint[property]
    }
    if (!responsiveRules.value.length) {
      return returnValue
    }

    const ruleMatch = responsiveRules.value.find((rule) => {
      if (!rule[property]) return

      if (breakpoint.maxWidth && rule.minWidth && rule.minWidth < breakpoint.maxWidth) return true

      if (breakpoint.maxWidth && rule.maxWidth && rule.maxWidth < breakpoint.maxWidth) return true

      if (breakpoint.minWidth && rule.minWidth && rule.minWidth > breakpoint.minWidth) return true

      if (breakpoint.minWidth && rule.maxWidth && rule.minWidth > breakpoint.minWidth) return true
    })

    return ruleMatch ? ruleMatch[property] : returnValue
  }

  function hashString(str) {
    let hash = 0
    for (let i = 0, len = str.length; i < len; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) << 0
    }
    return hash.toString(36)
  }

  function autoUnit(val) {
    return val ? (String(val).match(/^[\d\-.]+$/) ? `${val}px` : val) : '0px'
  }

  // -------------------------------------------------------

  // Code Tweening
  // -------------------------------------------------------

  // Methods
  function tweenToX(x) {
    targetX.value = Math.round(x)
    startTweening()
  }

  function startTweening() {
    if (tweening.value) return
    if (currentX.value === targetX.value) return
    tweening.value = true
  }

  function stopTweening() {
    tweening.value = false
  }

  function tweenToTarget() {
    currentX.value += (targetX.value - currentX.value) * props.tweenDampening

    if (Math.abs(targetX.value - currentX.value) < 1) {
      currentX.value = targetX.value
      tweening.value = false
    } else {
      rafId.value = window.requestAnimationFrame(tweenToTarget)
    }
  }

  function tweenToStop() {
    targetX.value = applyXBoundaries(currentX.value + dragVelocity.value * props.tweenInertia)
    startTweening()
  }

  // -------------------------------------------------------

  // Code Variabel Width
  // -------------------------------------------------------

  const isVariableWidth = computed(() => {
    return props.slidesPerPage == null
  })

  function captureTrackWidth() {
    if (!track.value) {
      return
    }

    measuredTrackWidth.value = track.value.scrollWidth
  }

  // -------------------------------------------------------

  // ---------------------------------------------------------------------------------------------

  // Code Accessibility
  // -------------------------------------------------------

  watch(usingKeyboard, () => {
    if (usingKeyboard.value) {
      return goto(0)
    }
  })

  // -------------------------------------------------------

  // Code Autoplay
  // -------------------------------------------------------

  watch(autoplayPaused, (paused) => {
    if (paused) {
      autoplayStop()
    } else {
      autoplayStart()
    }
  })

  // -------------------------------------------------------

  // Code Dragging
  // -------------------------------------------------------

  watch(pressing, () => {
    if (pressing.value) {
      dragVelocity.value = 0;
      preventContentDrag();
      stopTweening();
      emit('press');
    } else {
      if (isOutOfBounds.value && !shouldLoop.value) {
        if (currentX.value >= 0) gotoStart();
        else if (props.endless && currentX.value < 0) gotoStart()
        else gotoEnd();
      } else if (isVariableWidth.value) {
        tweenToStop();
      } else if (isVerticalDrag.value) {
        goto(indexValue.value);
      } else {
        goto(dragIndex.value);
      }

      dragging.value = false;
      startPointer.value = lastPointer.value = dragDirectionRatio.value = null;
      emit('release');
    }
  });

  watch(dragging, () => {
    if (dragging.value) emit('drag:start')
    else emit('drag:end')
  })

  watch(isVerticalDrag, () => {
    if (!isVerticalDrag.value && isTouchDrag.value) {
      pressing.value = false
    }
  })

  watch(preventVerticalScroll, (shouldPrevent) => {
    if (shouldPrevent) {
      window.addEventListener('touchmove', stopEvent, notPassive)
    } else {
      window.removeEventListener('touchmove', stopEvent, notPassive)
    }
  })

  // -------------------------------------------------------

  // Code Looping
  // -------------------------------------------------------

  watch(
    currentSlideIndex,
    () => {
      setSlideOrder()
    },
    { immediate: true },
  )

  watch(currentSlidesPerPage, () => {
    setSlideOrder()
  })

  // -------------------------------------------------------

  // Code Pagination
  // -------------------------------------------------------

  watch(
    () => props.modelValue,
    (newValue) => {
      if (newValue !== applyIndexBoundaries(newValue)) {
        emit('update:modelValue', boundedIndex.value)
      } else if (newValue !== boundedIndex.value) {
        goto(newValue)
      }
    },
  )

  watch(boundedIndex, () => {
    emit('change', { index: boundedIndex.value })
    emit('update:modelValue', boundedIndex.value)
  })

  // -------------------------------------------------------

  // Code Peeking
  // -------------------------------------------------------

  watch(
    () => [props.peekLeft, props.peekRight, props.peek, props.peekGutter, props.responsive],
    () => {
      capturePeekingMeasurements()
    },
  )

  // -------------------------------------------------------

  // Code Responsive
  // -------------------------------------------------------

  watch(pageWidth, () => {
    jumpToIndex(indexValue.value)
  })

  watch(disabled, () => {
    if (disabled.value) goto(0)
  })

  // -------------------------------------------------------

  // Code Tweening
  // -------------------------------------------------------

  watch(tweening, () => {
    if (tweening.value) {
      emit('tween:start', { index: indexValue.value })
      tweenToTarget()
    } else {
      window.cancelAnimationFrame(rafId.value)
      emit('tween:end', { index: indexValue.value })
    }
  })

  return {
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
    onMouseLeave,
    onPointerMove,
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
    currentIncompletePageOffset,
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
  }
}
