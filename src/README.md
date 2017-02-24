
source: http://jiongks.name/blog/vue-code-review/

# Vue 程序结构

- instance
  - api
    - data
    - dom
    - event
    - lifecycle
  - init
    - data
      - observer
        - deps <- ../fragment/directive
          - computed
          - watch
    - template
      - fragment
        - directive -(watcher)> .../observer/deps
          - repeat/if
          - component
          - transition
        - expression
        - filter
- global
  - api
  - options
    - directives
    - filters


整个实例初始化的过程中，重中之重就是把数据 (Model) 和视图 (View) 建立起关联关系。Vue.js 和诸多 MVVM 的思路是类似的，主要做了三件事：

- 通过 observer 对 data 进行了监听，并且提供订阅某个数据项的变化的能力
- 把 template 解析成一段 document fragment，然后解析其中的 directive，得到每一个 directive 所依赖的数据项及其更新方法。比如 v-text="message" 被解析之后 (这里仅作示意，实际程序逻辑会更严谨而复杂)：
  - 所依赖的数据项 this.$data.message，以及
  - 相应的视图更新方法 node.textContent = this.$data.message
- 通过 watcher 把上述两部分结合起来，即把 directive 中的数据依赖订阅在对应数据的 observer 上，这样当数据变化的时候，就会触发 observer，进而触发相关依赖对应的视图更新方法，最后达到模板原本的关联效果。

所以整个 vm 的核心，就是如何实现 observer, directive (parser), watcher 这三样东西。

# 文件结构

```
src/
├── compiler/
├── directives/
│   ├── element/
│   ├── internal/
│   └── public/
│       └── model/
├── filters/
├── fragment/
├── instance/
│   ├── api/           这几乎是最“上层”的接口封装，实际的实现都埋在了其它文件夹里
│   └── internal/
│       ├── scope.js   数据初始化，相关的子程序 (目录) 有 observer/*、watcher.js、batcher.js，
│       │                而 observer/dep.js 又是数据观察和视图依赖相关联的关键
│       ├── compile.js 视图初始化，相关的子程序 (目录) 有
│       │                compiler/*、directive.js、parsers/*
│       │
│       └── init.js   希望自顶向下了解 Vue.js 工作原理，从此文件看起
├── observer/
├── parsers/
├── transition/
├── util/             工具方法集合
├── cache.js        缓存机制
└── config.js       默认配置项
```
