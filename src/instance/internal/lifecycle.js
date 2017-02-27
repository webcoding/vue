import Directive from '../../directive'

import {
  replace,
  getAttr,
  isFragment
} from '../../util/index'

import {
  compile,
  compileRoot,
  transclude,
  resolveSlots
} from '../../compiler/index'

// 生命周期相关原型方法
// _updateRef _compile _initElement _bindDir _destroy _cleanup
export default function (Vue) {
  /**
   * Update v-ref for component.
   *
   * @param {Boolean} remove
   */

  Vue.prototype._updateRef = function (remove) {
    var ref = this.$options._ref
    if (ref) {
      var refs = (this._scope || this._context).$refs
      if (remove) {
        if (refs[ref] === this) {
          refs[ref] = null
        }
      } else {
        refs[ref] = this
      }
    }
  }

  /**
   * Transclude, compile and link element.
   *
   * If a pre-compiled linker is available, that means the
   * passed in element will be pre-transcluded and compiled
   * as well - all we need to do is to call the linker.
   *
   * Otherwise we need to call transclude/compile/link here.
   *
   * @param {Element} el
   */

  // _compile里分两步: compile 和 link
  // 1 compile过程是分析给定元素（el）或者模版（template），
  //    提取指令（directive）和创建对应离线的DOM元素（document fragment）
  // 2 每个compile函数之后都会返回一个link function（linkFn）。
  //    linkFn就是去实例化指令，将指令和新建的元素link在一起，然后将元素替换到DOM tree中去。
  //    每个linkFn函数都会返回一个unlink function（unlinkFn）。
  //    unlinkFn是在vm销毁的时候用的
  Vue.prototype._compile = function (el) {
    var options = this.$options

    // transclude and init element
    // transclude can potentially replace original
    // so we need to keep reference; this step also injects
    // the template and caches the original attributes
    // on the container node and replacer node.
    var original = el
    el = transclude(el, options)
    this._initElement(el)

    // handle v-pre on root node (#2026)
    if (el.nodeType === 1 && getAttr(el, 'v-pre') !== null) {
      return
    }

    // root is always compiled per-instance, because
    // container attrs and props can be different every time.
    var contextOptions = this._context && this._context.$options
    var rootLinker = compileRoot(el, options, contextOptions)

    // resolve slot distribution
    resolveSlots(this, options._content)

    // compile and link the rest
    var contentLinkFn
    var ctor = this.constructor
    // component compilation can be cached
    // as long as it's not using inline-template
    if (options._linkerCachable) {
      contentLinkFn = ctor.linker
      if (!contentLinkFn) {
        contentLinkFn = ctor.linker = compile(el, options)
      }
    }

    // link phase
    // make sure to link root with prop scope!
    var rootUnlinkFn = rootLinker(this, el, this._scope)
    var contentUnlinkFn = contentLinkFn
      ? contentLinkFn(this, el)
      : compile(el, options)(this, el)

    // register composite unlink function
    // to be called during instance destruction
    this._unlinkFn = function () {
      rootUnlinkFn()
      // passing destroying: true to avoid searching and
      // splicing the directives
      contentUnlinkFn(true)
    }

    // finally replace original
    if (options.replace) {
      replace(original, el)
    }

    this._isCompiled = true
    this._callHook('compiled')
  }

  /**
   * Initialize instance element. Called in the public
   * $mount() method.
   *
   * @param {Element} el
   */

  Vue.prototype._initElement = function (el) {
    if (isFragment(el)) {
      this._isFragment = true
      this.$el = this._fragmentStart = el.firstChild
      this._fragmentEnd = el.lastChild
      // set persisted text anchors to empty
      if (this._fragmentStart.nodeType === 3) {
        this._fragmentStart.data = this._fragmentEnd.data = ''
      }
      this._fragment = el
    } else {
      this.$el = el
    }
    this.$el.__vue__ = this
    this._callHook('beforeCompile')
  }

  /**
   * Create and bind a directive to an element.
   *
   * @param {Object} descriptor - parsed directive descriptor
   * @param {Node} node   - target node
   * @param {Vue} [host] - transclusion host component
   * @param {Object} [scope] - v-for scope
   * @param {Fragment} [frag] - owner fragment
   */

  Vue.prototype._bindDir = function (descriptor, node, host, scope, frag) {
    this._directives.push(
      // 实例化 directive
      // descriptor 是 compile 结果token中保存的信息
      new Directive(descriptor, this, node, host, scope, frag)
    )
  }

  /**
   * Teardown an instance, unobserves the data, unbind all the
   * directives, turn off all the event listeners, etc.
   *
   * @param {Boolean} remove - whether to remove the DOM node.
   * @param {Boolean} deferCleanup - if true, defer cleanup to
   *                                 be called later
   */

  Vue.prototype._destroy = function (remove, deferCleanup) {
    if (this._isBeingDestroyed) {
      if (!deferCleanup) {
        this._cleanup()
      }
      return
    }

    var destroyReady
    var pendingRemoval

    var self = this
    // Cleanup should be called either synchronously or asynchronoysly as
    // callback of this.$remove(), or if remove and deferCleanup are false.
    // In any case it should be called after all other removing, unbinding and
    // turning of is done
    var cleanupIfPossible = function () {
      if (destroyReady && !pendingRemoval && !deferCleanup) {
        self._cleanup()
      }
    }

    // remove DOM element
    if (remove && this.$el) {
      pendingRemoval = true
      this.$remove(function () {
        pendingRemoval = false
        cleanupIfPossible()
      })
    }

    this._callHook('beforeDestroy')
    this._isBeingDestroyed = true
    var i
    // remove self from parent. only necessary
    // if parent is not being destroyed as well.
    var parent = this.$parent
    if (parent && !parent._isBeingDestroyed) {
      parent.$children.$remove(this)
      // unregister ref (remove: true)
      this._updateRef(true)
    }
    // destroy all children.
    i = this.$children.length
    while (i--) {
      this.$children[i].$destroy()
    }
    // teardown props
    if (this._propsUnlinkFn) {
      this._propsUnlinkFn()
    }
    // teardown all directives. this also tearsdown all
    // directive-owned watchers.
    if (this._unlinkFn) {
      this._unlinkFn()
    }
    i = this._watchers.length
    while (i--) {
      this._watchers[i].teardown()
    }
    // remove reference to self on $el
    if (this.$el) {
      this.$el.__vue__ = null
    }

    destroyReady = true
    cleanupIfPossible()
  }

  /**
   * Clean up to ensure garbage collection.
   * This is called after the leave transition if there
   * is any.
   */

  Vue.prototype._cleanup = function () {
    if (this._isDestroyed) {
      return
    }
    // remove self from owner fragment
    // do it in cleanup so that we can call $destroy with
    // defer right when a fragment is about to be removed.
    if (this._frag) {
      this._frag.children.$remove(this)
    }
    // remove reference from data ob
    // frozen object may not have observer.
    if (this._data && this._data.__ob__) {
      this._data.__ob__.removeVm(this)
    }
    // Clean up references to private properties and other
    // instances. preserve reference to _data so that proxy
    // accessors still work. The only potential side effect
    // here is that mutating the instance after it's destroyed
    // may affect the state of other components that are still
    // observing the same object, but that seems to be a
    // reasonable responsibility for the user rather than
    // always throwing an error on them.
    this.$el =
    this.$parent =
    this.$root =
    this.$children =
    this._watchers =
    this._context =
    this._scope =
    this._directives = null
    // call the last hook...
    this._isDestroyed = true
    this._callHook('destroyed')
    // turn off all instance listeners.
    this.$off()
  }
}
