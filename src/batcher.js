import config from './config'
import {
  warn,
  nextTick,
  devtools
} from './util/index'

// we have two separate queues: one for directive updates
// and one for user watcher registered via $watch().
// we want to guarantee directive updates to be called
// before user watchers so that when user watchers are
// triggered, the DOM would have already been in updated
// state.

/**
 * watcher批量处理器
 *
 * 有两个分开的队列
 * 一个用于指令directive更新
 * 一个是用来给用户注册的$watch()
 *
 */


var queue = []          // dom更新队列
var userQueue = []
var has = {}            // 去重
var circular = {}
var waiting = false     //不重复创建nextTick

/**
 * Reset the batcher's state.
 */

function resetBatcherState () {
  queue.length = 0
  userQueue.length = 0
  has = {}
  circular = {}
  waiting = false
}

/**
 * Flush both queues and run the watchers.
 * 冲洗两个队列和运行观察对象
 */

function flushBatcherQueue () {
  runBatcherQueue(queue)
  runBatcherQueue(userQueue)
  // user watchers triggered more watchers,
  // keep flushing until it depletes
  if (queue.length) {
    return flushBatcherQueue()
  }
  // dev tool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
  resetBatcherState()
}

/**
 * Run the watchers in a single queue.
 *
 * 运行watcher对象 更新
 * @param {Array} queue  watcher对象合集
 */

function runBatcherQueue (queue) {
  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (let i = 0; i < queue.length; i++) {
    var watcher = queue[i]
    var id = watcher.id
    // 清空标记
    has[id] = null
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > config._maxUpdateCount) {
        warn(
          'You may have an infinite update loop for watcher ' +
          'with expression "' + watcher.expression + '"',
          watcher.vm
        )
        break
      }
    }
  }
  queue.length = 0
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 *
 * 增加一个watcher对象到这个watcher队列
 * @param {Watcher} watcher
 *   properties:
 *   - {Number} id
 *   - {Function} run
 */

export function pushWatcher (watcher) {
  const id = watcher.id
  if (has[id] == null) {
    // push watcher into appropriate queue
    const q = watcher.user
      ? userQueue
      : queue
    has[id] = q.length
    // 指令队列
    q.push(watcher)
    
    // queue the flush
    // 更新队列
    if (!waiting) {
      waiting = true
      nextTick(flushBatcherQueue)
    }
  }
}
