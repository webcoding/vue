/**
 * A doubly linked list-based Least Recently Used (LRU)
 * cache. Will keep most recently used items while
 * discarding least recently used items when its limit is
 * reached. This is a bare-bone version of
 * Rasmus Andersson's js-lru:
 *
 *   https://github.com/rsms/js-lru
 *
 * @desc 最近最少使用原则
 * @param {Number} limit [限定缓存数据的大小]
 * @constructor
 */

export default function Cache (limit) {
  this.size = 0
  this.limit = limit
  this.head = this.tail = undefined
  this._keymap = Object.create(null)
}

var p = Cache.prototype

/**
 * Put <value> into the cache associated with <key>.
 * Returns the entry which was removed to make room for
 * the new entry. Otherwise undefined is returned.
 * (i.e. if there was enough room already).
 *
 * @param {String} key
 * @param {*} value
 * @return {Entry|undefined}
 */

p.put = function (key, value) {
  var removed

  // 查询是否已经存在
  var entry = this.get(key, true)
  if (!entry) {
    // 如果溢出最大限定，返回清除的数据项，否则返回 undefined
    if (this.size === this.limit) {
      removed = this.shift()
    }
    entry = {
      key: key
    }
    // 保存
    this._keymap[key] = entry
    if (this.tail) {
      this.tail.newer = entry
      entry.older = this.tail
    } else {
      this.head = entry
    }
    this.tail = entry
    this.size++
  }
  // 无论数据是否已缓存，都更新 value
  entry.value = value

  return removed
}

/**
 * Purge the least recently used (oldest) entry from the
 * cache. Returns the removed entry or undefined if the
 * cache was empty.
 */

p.shift = function () {
  // 从缓存中清除第一个数据，返回该数据
  var entry = this.head
  if (entry) {
    this.head = this.head.newer
    this.head.older = undefined
    entry.newer = entry.older = undefined
    this._keymap[entry.key] = undefined
    this.size--
  }
  return entry
}

/**
 * Get and register recent use of <key>. Returns the value
 * associated with <key> or undefined if not in cache.
 *
 * @param {String} key
 * @param {Boolean} returnEntry
 * @return {Entry|*}
 */

p.get = function (key, returnEntry) {
  // 获取缓存中的数据，returnEntry为 true 时，查看是否存在 this._keymap[key]
  var entry = this._keymap[key]
  if (entry === undefined) return
  if (entry === this.tail) {
    return returnEntry
      ? entry
      : entry.value
  }
  // HEAD--------------TAIL
  //   <.older   .newer>
  //  <--- add direction --
  //   A  B  C  <D>  E
  // 当前数据结构如上，现更新数据 D，操作流程如下
  if (entry.newer) {
    if (entry === this.head) {
      this.head = entry.newer
    }
    entry.newer.older = entry.older // C <-- E.
  }
  if (entry.older) {
    entry.older.newer = entry.newer // C. --> E
  }
  entry.newer = undefined // D --x
  entry.older = this.tail // D. --> E
  if (this.tail) {
    this.tail.newer = entry // E. <-- D
  }
  this.tail = entry
  return returnEntry
    ? entry
    : entry.value
}
