import { def, indexOf } from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

/**
 * Intercept mutating methods and emit events
 *
 * 重写数组的方法，让方法可以支持监听，此策略有两个问题
 *  - 无法监听数据的 length，导致 arr.length 这样的数据改变无法被监听
 *  - 通过角标更改数据，即类似 arr[2] = 1 这样的赋值操作，也无法被监听
 *
 * 为此 Vue.js 在文档中明确提示不建议直接角标修改数据
 * 特提供 "糖方法" $set 和 $remove 来弥补这方面限制带来的不便
 */

;[
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]
.forEach(function (method) {
  // cache original method
  // 缓存原始的方法
  var original = arrayProto[method]
  // 扩展原型方法
  def(arrayMethods, method, function mutator () {
    // 数组计算处理
    // avoid leaking arguments:
    // http://jsperf.com/closure-with-arguments
    var i = arguments.length
    var args = new Array(i)
    while (i--) {
      args[i] = arguments[i]
    }
    var result = original.apply(this, args)
    var ob = this.__ob__
    var inserted
    switch (method) {
      case 'push':
        inserted = args
        break
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.dep.notify()
    return result
  })
})

/**
 * Swap the element at the given index with a new value
 * and emits corresponding event.
 *
 * @param {Number} index
 * @param {*} val
 * @return {*} - replaced element
 */

def(
  arrayProto,
  '$set',
  function $set (index, val) {
    if (index >= this.length) {
      this.length = Number(index) + 1
    }
    return this.splice(index, 1, val)[0]
  }
)

/**
 * Convenience method to remove the element at given index or target element reference.
 *
 * @param {*} item
 */

def(
  arrayProto,
  '$remove',
  function $remove (item) {
    /* istanbul ignore if */
    if (!this.length) return
    var index = indexOf(this, item)
    if (index > -1) {
      return this.splice(index, 1)
    }
  }
)
