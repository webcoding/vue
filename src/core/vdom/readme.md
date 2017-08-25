
# Vue原理解析之Virtual Dom

[source](https://segmentfault.com/a/1190000008291645)

一个VNode的实例对象包含了以下属性

- tag: 当前节点的标签名
- data: 当前节点的数据对象，具体包含哪些字段可以参考vue源码types/vnode.d.ts中对VNodeData的定义
- children: 数组类型，包含了当前节点的子节点
- text: 当前节点的文本，一般文本节点或注释节点会有该属性
- elm: 当前虚拟节点对应的真实的dom节点
- ns: 节点的namespace
- context: 编译作用域
- functionalContext: 函数化组件的作用域
- key: 节点的key属性，用于作为节点的标识，有利于patch的优化
- componentOptions: 创建组件实例时会用到的选项信息
- child: 当前节点对应的组件实例
- parent: 组件的占位节点
- raw: raw html
- isStatic: 静态节点的标识
- isRootInsert: 是否作为根节点插入，被`<transition>包裹的节点，该属性的值为false
- isComment: 当前节点是否是注释节点
- isCloned: 当前节点是否为克隆节点
- isOnce: 当前节点是否有`v-once`指令

## VNode分类

VNode可以理解为vue框架的虚拟dom的基类，通过new实例化的VNode大致可以分为几类

- EmptyVNode: 没有内容的注释节点
- TextVNode: 文本节点
- ElementVNode: 普通元素节点
- ComponentVNode: 组件节点
- CloneVNode: 克隆节点，可以是以上任意类型的节点，唯一的区别在于isCloned属性为true
- ...

### patch的策略是：

- 如果vnode不存在但是oldVnode存在，说明意图是要销毁老节点，那么就调用invokeDestroyHook(oldVnode)来进行销毁
- 如果oldVnode不存在但是vnode存在，说明意图是要创建新节点，那么就调用createElm来创建新节点
- 当vnode和oldVnode都存在时
    - 如果oldVnode和vnode是同一个节点，就调用patchVnode来进行patch
    - 当vnode和oldVnode不是同一个节点时，如果oldVnode是真实dom节点或hydrating设置为true，需要用hydrate函数将虚拟dom和真是dom进行映射，然后将oldVnode设置为对应的虚拟dom，找到oldVnode.elm的父节点，根据vnode创建一个真实dom节点并插入到该父节点中oldVnode.elm的位置
    这里面值得一提的是patchVnode函数，因为真正的patch算法是由它来实现的（patchVnode中更新子节点的算法其实是在updateChildren函数中实现的，为了便于理解，我统一放到patchVnode中来解释）。

### patchVnode算法是：

- 如果oldVnode跟vnode完全一致，那么不需要做任何事情
- 如果oldVnode跟vnode都是静态节点，且具有相同的key，当vnode是克隆节点或是v-once指令控制的节点时，只需要把oldVnode.elm和oldVnode.child都复制到vnode上，也不用再有其他操作
- 否则，如果vnode不是文本节点或注释节点
  - 如果oldVnode和vnode都有子节点，且2方的子节点不完全一致，就执行更新子节点的操作（这一部分其实是在updateChildren函数中实现），算法如下
    - 分别获取oldVnode和vnode的firstChild、lastChild，赋值给oldStartVnode、oldEndVnode、newStartVnode、newEndVnode
    - 如果oldStartVnode和newStartVnode是同一节点，调用patchVnode进行patch，然后将oldStartVnode和newStartVnode都设置为下一个子节点，重复上述流程
    - 如果oldEndVnode和newEndVnode是同一节点，调用patchVnode进行patch，然后将oldEndVnode和newEndVnode都设置为上一个子节点，重复上述流程
    - 如果oldStartVnode和newEndVnode是同一节点，调用patchVnode进行patch，如果removeOnly是false，那么可以把oldStartVnode.elm移动到oldEndVnode.elm之后，然后把oldStartVnode设置为下一个节点，newEndVnode设置为上一个节点，重复上述流程
    - 如果newStartVnode和oldEndVnode是同一节点，调用patchVnode进行patch，如果removeOnly是false，那么可以把oldEndVnode.elm移动到oldStartVnode.elm之前，然后把newStartVnode设置为下一个节点，oldEndVnode设置为上一个节点，重复上述流程
    - 如果以上都不匹配，就尝试在oldChildren中寻找跟newStartVnode具有相同key的节点，如果找不到相同key的节点，说明newStartVnode是一个新节点，就创建一个，然后把newStartVnode设置为下一个节点
    - 如果上一步找到了跟newStartVnode相同key的节点，那么通过其他属性的比较来判断这2个节点是否是同一个节点，如果是，就调用patchVnode进行patch，如果removeOnly是false，就把newStartVnode.elm插入到oldStartVnode.elm之前，把newStartVnode设置为下一个节点，重复上述流程
    - 如果在oldChildren中没有寻找到newStartVnode的同一节点，那就创建一个新节点，把newStartVnode设置为下一个节点，重复上述流程
    - 如果oldStartVnode跟oldEndVnode重合了，并且newStartVnode跟newEndVnode也重合了，这个循环就结束了
  - 如果只有oldVnode有子节点，那就把这些节点都删除
  - 如果只有vnode有子节点，那就创建这些子节点
  - 如果oldVnode和vnode都没有子节点，但是oldVnode是文本节点或注释节点，就把vnode.elm的文本设置为空字符串
- 如果vnode是文本节点或注释节点，但是vnode.text != oldVnode.text时，只需要更新vnode.elm的文本内容就可以

## 生命周期

patch提供了5个生命周期钩子，分别是

- create: 创建patch时
- activate: 激活组件时
- update: 更新节点时
- remove: 移除节点时
- destroy: 销毁节点时

这些钩子是提供给Vue内部的directives/ref/attrs/style等模块使用的，方便这些模块在patch的不同阶段进行相应的操作，这里模块定义在src/core/vdom/modules和src/platforms/web/runtime/modules2个目录中

vnode也提供了生命周期钩子，分别是

- init: vdom初始化时
- create: vdom创建时
- prepatch: patch之前
- insert: vdom插入后
- update: vdom更新前
- postpatch: patch之后
- remove: vdom移除时
- destroy: vdom销毁时

vue组件的生命周期底层其实就依赖于vnode的生命周期，在src/core/vdom/create-component.js中我们可以看到，vue为自己的组件vnode已经写好了默认的init/prepatch/insert/destroy，而vue组件的mounted/activated就是在insert中触发的，deactivated就是在destroy中触发的

### 实践

在Vue里面，Vue.prototype.$createElement对应vdom的createElement方法，Vue.prototype.__patch__对应patch方法，我写了个简单的demo来验证下功能
