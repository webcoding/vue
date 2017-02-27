import initMixin from './internal/init'
import stateMixin from './internal/state'
import eventsMixin from './internal/events'
import lifecycleMixin from './internal/lifecycle'
import miscMixin from './internal/misc'

import dataAPI from './api/data'
import domAPI from './api/dom'
import eventsAPI from './api/events'
import lifecycleAPI from './api/lifecycle'

/**
 * The exposed Vue constructor.
 *
 * API conventions: (API 惯例)
 * - public API methods/properties are prefixed with `$`
 * - internal methods/properties are prefixed with `_`
 * - non-prefixed properties are assumed to be proxied user
 *   data.
 *   公共API或属性前加 `$`
 *   内部调用方法或属性前加 `_`
 *   没有任何标示前缀的属性，看作为被代理的用户数据
 *
 * @constructor
 * @param {Object} [options]
 * @public
 */

// Vue 函数声明，this 指向 Vue 的作用上下文
function Vue (options) {
  this._init(options)
}


// 构建（install）Vue构造函数

// install internals
initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
miscMixin(Vue)

// install instance APIs
dataAPI(Vue)
domAPI(Vue)
eventsAPI(Vue)
lifecycleAPI(Vue)

export default Vue
