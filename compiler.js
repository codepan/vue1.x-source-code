class Compiler {
  /**
   * 构造函数中接收父元素节点，和Vue实例
   * @param {根节点} el 
   * @param {*} vm 
   */
  constructor (el, vm) {
    // 保存根节点，用户传入的根节点有可能是字符串选择器形式，也有可能是DOM形式，这里要做一下兼容处理
    this.el = this.isElementNode(el) ? el : document.querySelector(el)
    // 保存Vue实例
    this.vm = vm
    /* 
      拿到了根节点之后，我们就可以开始遍历每一个子节点一个一个进行编译替换，但是这样相当于直接操作DOM，性能不高。
      我们可以先将DOM节点一次性全部转移到内存中，然后进行编译替换，最后将处理后的DOM节点再一次性放回根节点中。

      原生js中document的createDocumentFragment()方法可以创建一个文档片段的实例，它可以满足我们的需求。
    */

    const fragment = this.node2Fragment(this.el)
    this.compile(fragment)
    this.el.appendChild(fragment)
  }

  /**
   * 节点转换为文档片段
   * @param {节点} node 
   * @return {文档片段} fragment
   */
  node2Fragment (node) {
    let fragment = document.createDocumentFragment()
    let firstChild = null
    while(firstChild = node.firstChild) {
      // appendChild方法具有两种特性：1.添加子节点；2.删除原节点，即可以说appendChild方法的作用为：移动节点
      // 移动一个节点，DOM节点就会少一个，一直循环下去，就会将所有真实的DOM节点全部移动到内存中，即存放在fragment中
      fragment.appendChild(firstChild)
    }
    return fragment
  }

  /**
   * 编译模板
   * @param {节点} node 
   */
  compile (node) {
    // 对所有子节点进行扫描编译
    // 注意：回车换行注释等都属于节点，这些节点都不包含在childNodes属性中，所以我们需要对每个节点进行判断
    node.childNodes.forEach(node => {
      /*
        这里需要判断节点的类型：
        如果是元素节点：则需要编译节点上的指令，例如v-html、v-text；
        如果是文本节点：这需要编译节点上的双花括号表达式{{}}
      */

      if (this.isTextNode(node)) {
        this.compileText(node)
      }

      if (this.isElementNode(node)) {
        this.compileElement(node)
        // 实现递归编译，因为childNodes只能拿到第一层子节点
        this.compile(node)
      }
    })
  }

  /**
   * 编译文本节点
   * @param {节点} node 
   */
  compileText (node) {
    // 这个正则用来匹配大胡子语法{{name}}
    const regExp = /\{\{(.+?)\}\}/g
    const exp = node.textContent
    if (regExp.test(exp)) {
      // 解析出节点的文本内容的表达式，然后使用data属性中定义的对应的数据进行替换
      CompileUtil['text'](node, this.vm, exp)
    }
  }

  /**
   * 编译元素节点
   * @param {节点} node 
   */
  compileElement (node) {
    [...node.attributes].forEach(attribute => {
      const { name: attrName, value: attrValue } = attribute
      if (this.isDirective(attrName)) {
        const [, directive] = attrName.split('-')
        const [directiveName, eventName] = directive.split(':')
        CompileUtil[directiveName](node, this.vm, attrValue, eventName)
      }
    })
  }
  /**
   * 是否是指令
   * @param {属性名} attrName 
   */
  isDirective (attrName) {
    return attrName.startsWith('v-')
  }

  /**
   * 是否是元素节点
   * @param {节点} node 
   */
  isElementNode (node) {
    return node.nodeType === 1
  }

  /**
   * 是否是文本节点
   * @param {节点} node 
   */
  isTextNode (node) {
    return node.nodeType === 3
  }
}

const CompileUtil = {
  _getValue (vm, exp) {
    return exp.split('.').reduce((prev, next) => prev[next], vm.$data)
  },
  _getTextValue (vm, exp) {
    const regExp = /\{\{(.+?)\}\}/g
    return exp.replace(regExp, (...arguments) => this._getValue(vm, arguments[1]))
  },
  _setValue (vm, exp, value) {
    exp = exp.split('.')
    exp.reduce((prev, next, index) => {
      if (index === exp.length - 1) {
        return prev[next] = value
      }
      return prev[next]
    }, vm.$data)
  },
  text (node, vm, exp) {
    const updateFn = this.updater['textUpdater']
    const regExp = /\{\{(.+?)\}\}/g
    exp.replace(regExp, (...arguments) => {
      // 创建一个观察者实例，传入Vue实例this.vm、表达式、回调函数
      new Watcher(vm, arguments[1], value => {
        // 收到数据的变化后，该回调函数就会被执行，value参数即为新的数据值
        updateFn && updateFn(node, this._getTextValue(vm, exp))
      })
    })
    updateFn && updateFn(node, this._getTextValue(vm, exp))
  },
  html (node, vm, exp) {
    const updateFn = this.updater['htmlUpdater']
    new Watcher(vm, exp, value => {
      updateFn && updateFn(node, value)
    })
    updateFn && updateFn(node, this._getValue(vm, exp))
  },
  model (node, vm, exp) {
    const updateFn = this.updater['modelUpdater']
    new Watcher(vm, exp, value => {
      updateFn && updateFn(node, value)
    })

    node.addEventListener('input', event => {
      this._setValue(vm, exp, event.target.value)
    })

    updateFn && updateFn(node, this._getValue(vm, exp))
  },
  /**
   * 向节点绑定事件
   * @param {节点} node 
   * @param {Vue实例} vm 
   * @param {表达式} exp 
   * @param {事件名} eventName 
   */
  on (node, vm, exp, eventName) {
    node.addEventListener(eventName, event => {
      vm[exp].call(vm, event)
    })
  },
  updater: {
    textUpdater (node, value) {
      node.textContent = value
    },
    htmlUpdater (node, value) {
      node.innerHTML = value
    },
    modelUpdater (node, value) {
      node.value = value
    }
  }
}