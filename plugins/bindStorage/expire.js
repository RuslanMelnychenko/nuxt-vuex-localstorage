export default {
  check: (storage = {}) => {
    const date = new Date().getTime()
    let copy = eval('(' + JSON.stringify(storage || {}) + ')')
    if(typeof copy.expireDate === 'number') {
      try {
        const expireDate = new Date(copy.expireDate).getTime()
        copy.expireDate = null
        if (expireDate < date) return null
      }
       catch (e) {}
    }
    return copy
  },
  create: (module, storage) => {
    const date = new Date().getTime()
    let copy = eval('(' + JSON.stringify(storage || {}) + ')')
    if(typeof module.expire === 'number') {
      const expireDate = date + (module.expire * 60 * 60 * 1000)
      copy.expireDate = new Date(expireDate)
    }
    return copy
  }
}
