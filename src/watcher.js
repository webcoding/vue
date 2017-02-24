import config from './config'
import Dep from './observer/dep'
import { parseExpression } from './parsers/expression'
import { pushWatcher } from './batcher'
import {
  extend,
  warn,
  isArray,
  isObject,
  nextTick,
  _Set as Set
} from './util/index'

let uid = 0

/**
 * watcher用来解析表达式
 * 收集依赖关系
 * 当表达式的值被改变触发callback回调函数
 * 给api或者指令 使用$watch()方法
 *
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 *
 * @param {Vue} vm
 * @param {String|Function} expOrFn
 * @param {Function} cb
 * @param {Object} options
 *                 - {Array} filters
 *                 - {Boolean} twoWay
 *                 - {Boolean} deep
 *                 - {Boolean} user
 *                 - {Boolean} sync
 *                 - {Boolean} lazy
 *                 - {Function} [preProcess]
 *                 - {Function} [postProcess]
 * @constructor
 */

export default function Watcher (vm, expOrFn, cb, options) {
  // mix in options
  if (options) {
    extend(this, options)
  }
  // 如果计算属性
  // expOrFn = function
  // 其余属性d,普通表达式 => !function
  var isFn = typeof expOrFn === 'function'
  this.vm = vm

  // 加 this 到观察数组
  vm._watchers.push(this)
  this.expression = expOrFn
  this.cb = cb

  // 定义一个标示
  this.id = ++uid // uid for batching
  this.active = true

  // 懒加载 不会立刻执行get
  this.dirty = this.lazy // for lazy watchers
  this.deps = []
  this.newDeps = []
  this.depIds = new Set()
  this.newDepIds = new Set()
  this.prevError = null // for async error stacks

  // parse expression for getter/setter
  // 解析表达式 得到setter/getter
  if (isFn) {
    // 计算属性 在编译的时候get == new Wathcher()
    this.getter = expOrFn
    this.setter = undefined
  } else {
    // v:on = "show" =>表达式，需要构建函数getter
    var res = parseExpression(expOrFn, this.twoWay)
    this.getter = res.get
    this.setter = res.set
  }

  // 获取值 懒加载,不执行
  this.value = this.lazy
    ? undefined
    : this.get()

  // state for avoiding false triggers for deep and Array
  // watchers during vm._digest()
  this.queued = this.shallow = false
}

/**
 * 获取值，收集依赖
 * Evaluate the getter, and re-collect dependencies.
 */

Watcher.prototype.get = function () {
  this.beforeGet()      // -> Dep.target = this
  var scope = this.scope || this.vm
  var value
  try {
    value = this.getter.call(scope, scope)
  } catch (e) {
    if (
      process.env.NODE_ENV !== 'production' &&
      config.warnExpressionErrors
    ) {
      warn(
        'Error when evaluating expression ' +
        '"' + this.expression + '": ' + e.toString(),
        this.vm
      )
    }
  }
  // "touch" every property so they are all tracked as
  // dependencies for deep watching
  if (this.deep) {
    traverse(value)
  }
  if (this.preProcess) {
    value = this.preProcess(value)
  }
  if (this.filters) {
    value = scope._applyFilters(value, null, this.filters, false)
  }
  if (this.postProcess) {
    value = this.postProcess(value)
  }
  this.afterGet()     // -> Dep.target = null
  return value
}

/**
 * Set the corresponding value with the setter.
 *
 * @param {*} value
 */

Watcher.prototype.set = function (value) {
  var scope = this.scope || this.vm
  if (this.filters) {
    value = scope._applyFilters(
      value, this.value, this.filters, true)
  }
  try {
    this.setter.call(scope, scope, value)
  } catch (e) {
    if (
      process.env.NODE_ENV !== 'production' &&
      config.warnExpressionErrors
    ) {
      warn(
        'Error when evaluating setter ' +
        '"' + this.expression + '": ' + e.toString(),
        this.vm
      )
    }
  }
  // two-way sync for v-for alias
  var forContext = scope.$forContext
  if (forContext && forContext.alias === this.expression) {
    if (forContext.filters) {
      process.env.NODE_ENV !== 'production' && warn(
        'It seems you are using two-way binding on ' +
        'a v-for alias (' + this.expression + '), and the ' +
        'v-for has filters. This will not work properly. ' +
        'Either remove the filters or use an array of ' +
        'objects and bind to object properties instead.',
        this.vm
      )
      return
    }
    forContext._withLock(function () {
      if (scope.$key) { // original is an object
        forContext.rawValue[scope.$key] = value
      } else {
        forContext.rawValue.$set(scope.$index, value)
      }
    })
  }
}

/**
 * 准备收集依赖
 * Prepare for dependency collection.
 */

Watcher.prototype.beforeGet = function () {
  Dep.target = this
}

/**
 * 给这个指令增加一个依赖
 * Dep.target.addDep(this)
 *
 * 计算属性在getter的时候处理
 * 增加get的dep到当前指定的watcer对象中
 *
 * value
 *   =>getter
 *   =>Dep.target
 *   =>dep.depend
 *
 * Add a dependency to this directive.
 *
 * @param {Dep} dep
 */

Watcher.prototype.addDep = function (dep) {
  var id = dep.id

  // 把更新的dep加入到当前的newDeps列表中
  // 求值函数
  // 可能是多个dep依赖到watcher上
  // 所以deps可能是组数
  if (!this.newDepIds.has(id)) {
    this.newDepIds.add(id)
    this.newDeps.push(dep)
    if (!this.depIds.has(id)) {
      // 把当前的watcher对象
      // 反向加入到数据计算的dep中、
      // this.subs.push(sub);
      // 所以可以在setter的时候，派发这个sub任务
      // 也就是setter的时候可以调用 wather
      dep.addSub(this)
    }
  }
}

/**
 * 清理依赖收集
 * Clean up for dependency collection.
 */

Watcher.prototype.afterGet = function () {
  Dep.target = null
  var i = this.deps.length
  while (i--) {
    var dep = this.deps[i]
    if (!this.newDepIds.has(dep.id)) {
      dep.removeSub(this)
    }
  }
  var tmp = this.depIds
  this.depIds = this.newDepIds
  this.newDepIds = tmp
  this.newDepIds.clear()
  tmp = this.deps
  this.deps = this.newDeps
  this.newDeps = tmp
  this.newDeps.length = 0
}

/**
 * 订阅接口
 * 当依赖被改变时候调用
 * _data setter = >调用
 *
 * Subscriber interface.
 * Will be called when a dependency changes.
 *
 * @param {Boolean} shallow
 */

Watcher.prototype.update = function (shallow) {
  //如果懒加载
  //watcher是计算属性
  if (this.lazy) {
    this.dirty = true
  } else if (this.sync || !config.async) {
    this.run()
  } else {
    // if queued, only overwrite shallow with non-shallow,
    // but not the other way around.
    this.shallow = this.queued
      ? shallow
        ? this.shallow
        : false
      : !!shallow
    this.queued = true
    // record before-push error stack in debug mode
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.debug) {
      this.prevError = new Error('[vue] async stack trace')
    }
    pushWatcher(this)
  }
}

/**
 * Batcher工作的接口
 * 提供给被Batcher方法调用 nextTickHandler
 * 在watcher队列运行
 *
 * Batcher job interface.
 * Will be called by the batcher.
 */

Watcher.prototype.run = function () {
  if (this.active) {
    //新值
    var value = this.get()
    if (
      value !== this.value ||
      // Deep watchers and watchers on Object/Arrays should fire even
      // when the value is the same, because the value may
      // have mutated; but only do so if this is a
      // non-shallow update (caused by a vm digest).
      ((isObject(value) || this.deep) && !this.shallow)
    ) {
      // set new value
      var oldValue = this.value
      this.value = value
      // in debug + async mode, when a watcher callbacks
      // throws, we also throw the saved before-push error
      // so the full cross-tick stack trace is available.
      var prevError = this.prevError
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' &&
          config.debug && prevError) {
        this.prevError = null
        try {
          this.cb.call(this.vm, value, oldValue)
        } catch (e) {
          nextTick(function () {
            throw prevError
          }, 0)
          throw e
        }
      } else {
        this.cb.call(this.vm, value, oldValue)
      }
    }
    this.queued = this.shallow = false
  }
}

/**
 * 给计算属性使用
 * 仅仅为懒加载watchers的get方法使用
 * 求出观察的值
 * b:function(){
 *   return this.a + this.c
 * }
 *
 * b 生成了watcher
 * 建立a与c的依赖关系
 *
 * Evaluate the value of the watcher.
 * This only gets called for lazy watchers.
 */

Watcher.prototype.evaluate = function () {
  // avoid overwriting another watcher that is being
  // collected.
  // 避免引用丢失
  // this.get中会做依赖处理，会覆盖Dep.target
  var current = Dep.target

  // 获取值 并且设置依赖
  this.value = this.get()
  this.dirty = false
  Dep.target = current
}

/**
 * 用当前的watcher收集所有的dess合集
 *
 * Depend on all deps collected by this watcher.
 */

Watcher.prototype.depend = function () {
  var i = this.deps.length
  while (i--) {
    this.deps[i].depend()
  }
}

/**
 * Remove self from all dependencies' subcriber list.
 */

Watcher.prototype.teardown = function () {
  if (this.active) {
    // remove self from vm's watcher list
    // this is a somewhat expensive operation so we skip it
    // if the vm is being destroyed or is performing a v-for
    // re-render (the watcher list is then filtered by v-for).
    if (!this.vm._isBeingDestroyed && !this.vm._vForRemoving) {
      this.vm._watchers.$remove(this)
    }
    var i = this.deps.length
    while (i--) {
      this.deps[i].removeSub(this)
    }
    this.active = false
    this.vm = this.cb = this.value = null
  }
}

/**
 * Recrusively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 *
 * @param {*} val
 */

const seenObjects = new Set()
function traverse (val, seen) {
  let i, keys
  if (!seen) {
    seen = seenObjects
    seen.clear()
  }
  const isA = isArray(val)
  const isO = isObject(val)
  if ((isA || isO) && Object.isExtensible(val)) {
    if (val.__ob__) {
      var depId = val.__ob__.dep.id
      if (seen.has(depId)) {
        return
      } else {
        seen.add(depId)
      }
    }
    if (isA) {
      i = val.length
      while (i--) traverse(val[i], seen)
    } else if (isO) {
      keys = Object.keys(val)
      i = keys.length
      while (i--) traverse(val[keys[i]], seen)
    }
  }
}
