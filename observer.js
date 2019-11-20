class Observer {
  constructor (data) {
    this.observe(data)
  }

  observe (data) {
    if (!data || typeof data !== 'object') {
      return
    }

    Object.entries(data).forEach(([key, value]) => {
      this.defineReactive(data, key, value)
      this.observe(value)
    })
  }

  defineReactive (data, key, value) {
    const dep = new Dep()
    Object.defineProperty(data, key, {
      get () {
        Dep.target && dep.addWatcher(Dep.target)
        return value
      },
      set (newValue) {
        if (newValue === value) {
          return
        }
        value = newValue
        dep.notify()
      }
    })
  }
}