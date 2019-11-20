class Vue {
  constructor (options) {
    this.$el = options.el
    this.$data = options.data

    const computed = options.computed
    const methods = options.methods
    if (this.$el) {
      new Observer(this.$data)

      Object.entries(computed).forEach(([key, value]) => {
        Object.defineProperty(this.$data, key, {
          get: () => {
            return value.call(this)
          }
        })
      })

      Object.entries(methods).forEach(([key, value]) => {
        Object.defineProperty(this, key, {
          get: () => value
        })
      })

      this.proxyData(this.$data)
      new Compiler(this.$el, this)
    }
  }
  /**
   * 数据代理
   * @param {数据} data 
   */
  proxyData (data) {
    Object.entries(data).forEach(([key, value]) => {
      Object.defineProperty(this, key, {
        get () {
          return value
        },
        set (newValue) {
          data[key] = newValue
        }
      })
    })
  }
}