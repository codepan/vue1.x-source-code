class Dep {
  constructor () {
    this.watchers = []
  }
  addWatcher (watcher) {
    this.watchers.push(watcher)
  }
  notify () {
    this.watchers.forEach(watcher => watcher.update())
  }
}

class Watcher {
  /**
   * 
   * @param {Vue实例} vm 
   * @param {表达式} exp 
   * @param {回调函数} cb 
   */
  constructor (vm, exp, cb) {
    this.vm = vm
    this.exp = exp
    this.cb = cb

    // 将当前Watcher实例指定到Dep静态属性target上
    Dep.target = this
    //获取一次数据，触发数据的getter，然后在getter中添加依赖
    this.getValue()
    // 需要清空本次的Watcher实例，以便添加其它的Watcher实例
    Dep.target = null
  }

  getValue () {
    return this.exp.split('.').reduce((prev, next) => prev[next], this.vm.$data)
  }

  update () {
    this.cb(this.getValue())
  }
}
