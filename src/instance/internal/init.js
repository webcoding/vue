import { mergeOptions } from '../../util/index'

let uid = 0

// 匿名函数 `export default`，参数是 Vue
// 这种方式匿名方式 `export`，那么 `import` 可以用任意名称
export default function (Vue) {
  /**
   * The main init sequence. This is called for every
   * instance, including ones that are created from extended
   * constructors.
   *
   * @param {Object} options - this options object should be
   *                           the result of merging class
   *                           options and the options passed
   *                           in to the constructor.
   */

  // 对传入的 Vue 添加原型方法 _init
  Vue.prototype._init = function (options) {
    options = options || {}

    // $ 开头的表示 public-api, _ 开头的表示 internal-api
    // 八大实例属性:
    // $el $parent $root $children $options $refs $els $state
    this.$el = null
    this.$parent = options.parent
    this.$root = this.$parent
      ? this.$parent.$root
      : this
    this.$children = []   // 直接子组件
    this.$refs = {}       // child vm references 包含注册有 v-ref 的子组件
    this.$els = {}        // element references  包含注册有 v-el 的 DOM 元素

    this._watchers = []   // all watchers as an array
    this._directives = [] // all directives

    // a uid
    this._uid = uid++

    // a flag to avoid this being observed
    this._isVue = true

    // events bookkeeping 事件统计
    this._events = {}            // registered callbacks

    // @see /instance/api/events.js -> $broadcast
    // 这是为了避免不必要的深度遍历：在有广播事件到来时，如果当前 vm 的 _eventsCount 为 0，
    // 则不必向其子 vm 继续传播该事件。
    this._eventsCount = {}       // for $broadcast optimization

    // fragment instance properties
    this._isFragment = false
    this._fragment =         // @type {DocumentFragment}
    this._fragmentStart =    // @type {Text|Comment}
    this._fragmentEnd = null // @type {Text|Comment}

    // lifecycle state
    this._isCompiled =
    this._isDestroyed =
    this._isReady =
    this._isAttached =
    this._isBeingDestroyed =
    this._vForRemoving = false
    this._unlinkFn = null

    // context:
    // if this is a transcluded component, context
    // will be the common parent vm of this instance
    // and its host.
    this._context = options._context || this.$parent

    // scope:
    // if this is inside an inline v-for, the scope
    // will be the intermediate scope created for this
    // repeat fragment. this is used for linking props
    // and container directives.
    this._scope = options._scope

    // fragment:
    // if this instance is compiled inside a Fragment, it
    // needs to register itself as a child of that fragment
    // for attach/detach to work properly.
    this._frag = options._frag
    if (this._frag) {
      this._frag.children.push(this)
    }

    // push self into parent / transclusion host
    if (this.$parent) {
      this.$parent.$children.push(this)
    }

    // merge options.
    options = this.$options = mergeOptions(
      this.constructor.options,
      options,
      this
    )

    // set ref
    this._updateRef()

    // initialize data as empty object.
    // it will be filled up in _initData().
    this._data = {}

    // call init hook
    this._callHook('init')

    // initialize data observation and scope inheritance.
    this._initState()

    // setup event system and option events.
    this._initEvents()

    // call created hook
    this._callHook('created')

    // if `el` option is passed, start compilation.
    if (options.el) {
      this.$mount(options.el)
    }
  }
}
