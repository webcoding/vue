/* globals MutationObserver */

// can we use __proto__?
// 对象是否有__proto__原型引用
export const hasProto = '__proto__' in {}

// Browser environment sniffing
export const inBrowser =
  typeof window !== 'undefined' &&
  Object.prototype.toString.call(window) !== '[object Object]'

// detect devtools
export const devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__

// UA sniffing for working around browser-specific quirks
const UA = inBrowser && window.navigator.userAgent.toLowerCase()
export const isIE = UA && UA.indexOf('trident') > 0
export const isIE9 = UA && UA.indexOf('msie 9.0') > 0
export const isAndroid = UA && UA.indexOf('android') > 0
export const isIOS = UA && /iphone|ipad|ipod|ios/.test(UA)

let transitionProp
let transitionEndEvent
let animationProp
let animationEndEvent

// Transition property/event sniffing
if (inBrowser && !isIE9) {
  const isWebkitTrans =
    window.ontransitionend === undefined &&
    window.onwebkittransitionend !== undefined
  const isWebkitAnim =
    window.onanimationend === undefined &&
    window.onwebkitanimationend !== undefined
  transitionProp = isWebkitTrans
    ? 'WebkitTransition'
    : 'transition'
  transitionEndEvent = isWebkitTrans
    ? 'webkitTransitionEnd'
    : 'transitionend'
  animationProp = isWebkitAnim
    ? 'WebkitAnimation'
    : 'animation'
  animationEndEvent = isWebkitAnim
    ? 'webkitAnimationEnd'
    : 'animationend'
}

export {
  transitionProp,
  transitionEndEvent,
  animationProp,
  animationEndEvent
}

/* istanbul ignore next */
function isNative (Ctor) {
  return /native code/.test(Ctor.toString())
}

/**
 * 异步延迟一个任务来执行它
 * 利用MutationObserver来执行
 * 否则用setTimeout(0)
 *
 * Defer a task to execute it asynchronously. Ideally this
 * should be executed as a microtask, so we leverage
 * MutationObserver if it's available, and fallback to
 * setTimeout(0).
 *
 * @param {Function} cb
 * @param {Object} ctx
 */

export const nextTick = (function () {
  const callbacks = []
  let pending = false
  let timerFunc

  // 触发所有更新
  function nextTickHandler () {
    pending = false
    const copies = callbacks.slice(0)
    callbacks.length = 0
    for (let i = 0; i < copies.length; i++) {
      copies[i]()
    }
  }


  // Mutation Observer（变动观察器）是监视DOM变动的接口。
  // 当DOM对象树发生任何变动时，Mutation Observer会得到通知。
  // 这样设计是为了应付DOM变动频繁的情况。
  // 举例来说，
  // 如果在文档中连续插入1000个段落（p元素），
  // 会连续触发1000个插入事件，执行每个事件的回调函数，
  // 这很可能造成浏览器的卡顿；而MutationObserver完全不同，
  // 只在1000个段落都插入结束后才会触发，而且只触发一次。
  //
  // MutationObserver所观察的DOM变动（即上面代码的option对象），包含以下类型：
  //  childList：子元素的变动
  //  attributes：属性的变动
  //  characterData：节点内容或节点文本的变动
  //  subtree：所有下属节点（包括子节点和子节点的子节点）的变动


  // the nextTick behavior leverages the microtask queue, which can be accessed
  // via either native Promise.then or MutationObserver.
  // MutationObserver has wider support, however it is seriously bugged in
  // UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
  // completely stops working after triggering a few times... so, if native
  // Promise is available, we will use it:
  /* istanbul ignore if */
  if (typeof Promise !== 'undefined' && isNative(Promise)) {
    var p = Promise.resolve()
    var noop = function () {}
    timerFunc = () => {
      p.then(nextTickHandler)
      // in problematic UIWebViews, Promise.then doesn't completely break, but
      // it can get stuck in a weird state where callbacks are pushed into the
      // microtask queue but the queue isn't being flushed, until the browser
      // needs to do some other work, e.g. handle a timer. Therefore we can
      // "force" the microtask queue to be flushed by adding an empty timer.
      if (isIOS) setTimeout(noop)
    }
  } else if (typeof MutationObserver !== 'undefined') {
    // use MutationObserver where native Promise is not available,
    // e.g. IE11, iOS7, Android 4.4
    var counter = 1
    var observer = new MutationObserver(nextTickHandler)
    var textNode = document.createTextNode(String(counter))
    
    // 节点内容或节点文本的变动
    observer.observe(textNode, {
      characterData: true
    })
    timerFunc = () => {
      counter = (counter + 1) % 2
      textNode.data = String(counter)
    }
  } else {
    // fallback to setTimeout
    /* istanbul ignore next */
    timerFunc = setTimeout
  }

  return function (cb, ctx) {
    var func = ctx
      ? function () { cb.call(ctx) }
      : cb
    callbacks.push(func)

    // 状态控制
    // 如果执行了就不在调用
    // 等一下次完毕
    if (pending) return
    pending = true
    timerFunc(nextTickHandler, 0)
  }
})()

let _Set
/* istanbul ignore if */
if (typeof Set !== 'undefined' && isNative(Set)) {
  // use native Set when available.
  _Set = Set
} else {
  // a non-standard Set polyfill that only works with primitive keys.
  _Set = function () {
    this.set = Object.create(null)
  }
  _Set.prototype.has = function (key) {
    return this.set[key] !== undefined
  }
  _Set.prototype.add = function (key) {
    this.set[key] = 1
  }
  _Set.prototype.clear = function () {
    this.set = Object.create(null)
  }
}

export { _Set }
