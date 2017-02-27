import Dep from './dep'
import { arrayMethods } from './array'
import {
  def,
  isArray,
  isPlainObject,
  hasProto,
  hasOwn
} from '../util/index'

/**
 * arrayKeys 是什么，应该就是 push，pop那些数组原型方法名集合
 *
 * NOTE:
 * 增强数组之前 arr.__proto__ -> Array.prototype
 * 增强之后 arr.__proto__ -> arrayMethods[__proto__] -> Array.prototype
 * @see https://segmentfault.com/a/1190000006938217#articleHeader2
 */

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However in certain cases, e.g.
 * v-for scope alias and props, we don't want to force conversion
 * because the value may be a nested value under a frozen data structure.
 *
 * So whenever we want to set a reactive property without forcing
 * conversion on the new value, we wrap that call inside this function.
 */

let shouldConvert = true
export function withoutConversion (fn) {
  shouldConvert = false
  fn()
  shouldConvert = true
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 *
 * Observer 观察者，就是使data变成“发布者”，watcher是订阅者，订阅data的变化。
 *
 * @param {Array|Object} value
 * @constructor
 */

// Observer是将输入的Plain Object进行处理，利用Object.defineProperty转化为getter与setter，
// 从而在赋值与取值时进行拦截 这是Vue响应式框架的基础

// 给每一个观察的数据组设置观察
export function Observer (value) {
  this.value = value
  this.dep = new Dep()

  // 定义一个__ob__（其中的 value引用this）
  def(value, '__ob__', this)

  if (isArray(value)) {   // 数组分支
    /**
      * augment 增强数组，即对数组进行扩展，使其能detect change。这里面有两个内容，
      * 一是拦截数组的 [mutation methods](http://vuejs.org/guide/list.html#Mutation-Methods)（导致数组本身发生变化的方法）
      *    拦截有两个方法：如果浏览器实现 __proto__ 那么就使用protoAugment，否则就使用copyAugment。
      * 二是提供 $set 和 $remove 两个[便利方法](http://vuejs.org/guide/list.html#Caveats) 。
     */
    var augment = hasProto
      ? protoAugment
      : copyAugment       // 选择增强方法

    // 重写数组的方法
    augment(value, arrayMethods, arrayKeys)

    // 是数组，就每个数据分别观察
    this.observeArray(value)
  } else {    // plain object分支
    this.walk(value)
  }
}

// Instance methods

/**
 * Walk through each property and convert them into
 * getter/setters. This method should only be called when
 * value type is Object.
 *
 * @param {Object} obj
 */

Observer.prototype.walk = function (obj) {
  // 如果obj是多个对象 分开转化
  var keys = Object.keys(obj)
  for (var i = 0, l = keys.length; i < l; i++) {
    this.convert(keys[i], obj[keys[i]])
  }
}

/**
 * Observe a list of Array items.
 *
 * @param {Array} items
 */

// 如果是数组
// 分解每一个元素建立观察(生成Observer实例)
Observer.prototype.observeArray = function (items) {
  for (var i = 0, l = items.length; i < l; i++) {
    observe(items[i])
  }
}

/**
 * Convert a property into getter/setter so we can emit
 * the events when the property is accessed/changed.
 * 给 data.prop 属性添加reactiveGetter和reactiveSetter
 *
 * @param {String} key
 * @param {*} val
 */

Observer.prototype.convert = function (key, val) {
  defineReactive(this.value, key, val)
}

/**
 * Add an owner vm, so that when $set/$delete mutations
 * happen we can notify owner vms to proxy the keys and
 * digest the watchers. This is only called when the object
 * is observed as an instance's root $data.
 *
 * @param {Vue} vm
 */

Observer.prototype.addVm = function (vm) {
  (this.vms || (this.vms = [])).push(vm)
}

/**
 * Remove an owner vm. This is called when the object is
 * swapped out as an instance's $data object.
 *
 * @param {Vue} vm
 */

Observer.prototype.removeVm = function (vm) {
  this.vms.$remove(vm)
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 *
 * @param {Object|Array} target
 * @param {Object} src
 */

// 截取原型链拦截
function protoAugment (target, src) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 *
 * @param {Object|Array} target
 * @param {Object} proto
 */

// 通过定义属性拦截
function copyAugment (target, src, keys) {
  for (var i = 0, l = keys.length; i < l; i++) {
    var key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 *
 * @param {*} value
 * @param {Vue} [vm]
 * @return {Observer|undefined}
 * @static
 */

// 在observe()函数中还做了些能否observe的条件判断，这些条件有：
export function observe (value, vm) {
  if (!value || typeof value !== 'object') {
    return
  }
  var ob
  if (
    // 1 没有被observe过（observe过的对象都会被添加__ob__属性）
    hasOwn(value, '__ob__') &&
    value.__ob__ instanceof Observer
  ) {
    ob = value.__ob__
  } else if (
    // 2 只能是plain object（toString.call(ob) === "[object Object]"）或者数组
    // 3 object是extensible的（Object.isExtensible(obj) === true）
    // 4 不能是Vue实例（obj._isVue !== true）
    shouldConvert &&
    (isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (ob && vm) {
    ob.addVm(vm)
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * 数据监听机制
 *
 * 如何监听某一个对象属性的变化呢？
 * 我们很容易想到 Object.defineProperty 这个 API，
 * 为此属性设计一个特殊的 getter/setter，
 * 然后在 setter 里触发一个函数，就可以达到监听的效果。
 * 为此，Vue.js 对可能改变数据的方法，全进行 prototype 更改，参见 observer/array.js
 *
 * @param {Object} obj
 * @param {String} key
 * @param {*} val
 */

export function defineReactive (obj, key, val) {
  var dep = new Dep()

  var property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  var getter = property && property.get
  var setter = property && property.set

  // 继续分解 val，因为 val 可能还是数组或对象结构
  var childOb = observe(val)

  /**
   * NOTE: Object.defineProperty(obj, key, descriptor) 方法，https://segmentfault.com/a/1190000004346467
   *       descriptor 中不能同时设置访问器（get 和 set）和 wriable 或 value，否则会错，
   *       就是说想用 get 和 set，就不能用 writable 或 value 中的任何一个
   *
   * @more /instace/internal/state.js -> Object.defineProperty
   */
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      var value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()  // 收集依赖
        if (childOb) {
          childOb.dep.depend()
        }
        if (isArray(value)) {
          for (var e, i = 0, l = value.length; i < l; i++) {
            e = value[i]
            e && e.__ob__ && e.__ob__.dep.depend()
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      var value = getter ? getter.call(obj) : val
      if (newVal === value) {
        return
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = observe(newVal)
      dep.notify()  // 观察这个数据的依赖（watcher）
    }
  })
}
