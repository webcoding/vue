import { toArray } from '../util/index'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * 依赖收集和notify
 *
 * @constructor
 */

export default function Dep () {
  this.id = uid++

  // 收集wathcher
  // 保存着订阅者（即watcher）的数组，当被观察数据发生变化时，即被调用setter，
  // 那么dep.notify()就循环这里的订阅者，分别调用他们的update方法。
  this.subs = []
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
// 这里值得注意的是Dep.target，由于JS的单线程特性，同一时刻只能有一个watcher去get数据的值，
// 所以target在全局下只需要有一个就可以了。
Dep.target = null

/**
 * Add a directive subscriber.
 *
 * @param {Directive} sub
 */

Dep.prototype.addSub = function (sub) {
  this.subs.push(sub)
}

/**
 * Remove a directive subscriber.
 *
 * @param {Directive} sub
 */

Dep.prototype.removeSub = function (sub) {
  this.subs.$remove(sub)
}

/**
 * Add self as a dependency to the target watcher.
 */

Dep.prototype.depend = function () {
  // Dep.target 就是 Watcher 的实例
  Dep.target.addDep(this)
}

/**
 * Notify all subscribers of a new value.
 */

Dep.prototype.notify = function () {
  // stablize the subscriber list first
  var subs = toArray(this.subs)
  for (var i = 0, l = subs.length; i < l; i++) {
    subs[i].update()
  }
}
