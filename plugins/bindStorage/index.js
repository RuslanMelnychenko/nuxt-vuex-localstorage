import Crypto from 'nuxt-vuex-localstorage/plugins/crypto'
import expire from 'nuxt-vuex-localstorage/plugins/bindStorage/expire'
import Vue from 'vue'

const storageFunction = (() => {
  try {
    const storage = {
      local: window.localStorage,
      session: window.sessionStorage
    }
    storage.local.setItem('__local_test', 1)
    storage.local.removeItem('__local_test')
    storage.session.setItem('__session_test', 1)
    storage.session.removeItem('__session_test')

    return require('nuxt-vuex-localstorage/plugins/bindStorage/webStorage')
  } catch (e) {
    return require('nuxt-vuex-localstorage/plugins/bindStorage/cookie')
  }
})()

export default async (ctx, options) => {
  const store         = ctx.store
  const crypto        = await new Crypto(ctx, options)
  let localStoreNames = options.localStorage || []
  if (typeof options.localStorage === 'string') localStoreNames = [options.localStorage]
  let sessionStoreNames = options.sessionStorage || []
  if (typeof options.sessionStorage === 'string') sessionStoreNames = [options.sessionStorage]
  const versionPropName = options.versionPropName || '__version'

  const watchFunction_local = (i, val) => {
    const data = JSON.stringify(expire.create(val))
    storageFunction.local.set(getModuleName(localStoreNames[i]), crypto.encrypt(data))
  }

  const getModuleName = module => module.prop? `${module.name}/${module.prop}`: `${module.name}`;

  const getData = (data, module) => {
    try {
      if(module.prop)
        return data[module.name][module.prop]
      else
        return data[module.name]
    } catch (e) {
    }
    return {};
  }

  const setData = (data, module, value) => {
    try {
      if(module.prop)
        return data[module.name][module.prop] = value
      else
        return data[module.name] = value
    } catch (e) {
    }
    return {};
  }

  const getCopyStore = () => {
    return JSON.parse(JSON.stringify(store.state))
  }

  let watchHandlers_local = []
  const watcher_local     = (module, i) => {
    return store.watch(state => {
        return getData(state, module)
      },
      val => watchFunction_local(i, val),
      {deep: true})
  }

  const bindLocalStorage = module => {
    const localPersist  = JSON.parse(crypto.decrypt(storageFunction.local.get(getModuleName(module))))
    let data            = getCopyStore()
    const expireChecked = expire.check(localPersist)
    if (getData(store.state, module) && expireChecked[versionPropName] === getData(store.state, module)[versionPropName])
      setData(data, module, Object.assign({}, getData(data, module), expireChecked, {___status: true}))
    store.replaceState(data)

    localStoreNames.forEach((module, i) => {
      watchHandlers_local[i] = watcher_local(module, i)
    })
  }

  const watchOtherBrowsersStorage = () => {
    window.addEventListener('storage', (event) => {
      if(!event) return false
      const [name, prop] = event.key.split('/', 2);
      const module = localStoreNames.find((e) => {
        return e.name === name && (!prop || e.prop === prop)
      });
      if (module && getData(store.state, module) && module.tabSync !== false) {
        console.group('addEventListener(storage)')
        let data = getCopyStore()
        setData(data, module, expire.check(JSON.parse(crypto.decrypt(event.newValue))))
        if (JSON.stringify(data) !== JSON.stringify(store.state))
          store.replaceState(data)
        console.groupEnd()
      }
    })
  }

  const watchFunction_session = (i, val) => {
    const data = JSON.stringify(expire.create(val))
    storageFunction.session.set(getModuleName(sessionStoreNames[i]), crypto.encrypt(data))
  }

  let watchHandlers_session = []
  const watcher_session     = (module, i) => {
    return store.watch(state => {
        return getData(state, module)
      },
      val => watchFunction_session(i, val),
      {deep: true})
  }

  const bindSessionStorage = module => {
    const sessionPersist = JSON.parse(crypto.decrypt(storageFunction.session.get(getModuleName(module))))
    let data             = getCopyStore()
    const expireChecked  = expire.check(sessionPersist)
    if (getData(store.state, module) && expireChecked[versionPropName] === getData(store.state, module)[versionPropName])
      setData(data, module, Object.assign({}, getData(data, module), expireChecked, {___status: true}))
    store.replaceState(data)

    sessionStoreNames.forEach((module, i) => {
      watchHandlers_session[i] = watcher_session(module, i)
    })
  }

  switch (options.mode) {
    case 'manual':
      watchOtherBrowsersLocalStorage()
      Vue.prototype.$setWebStorageKey = (key, salt, keyMixTimes, keyLength) => crypto.setKey(key, salt, keyMixTimes, keyLength)
      let localStorageStatusWatchers  = []
      localStoreNames.forEach((module, i) => {
        localStorageStatusWatchers.push(store.watch(state => {
          return getData(state, module).___status
        }, val => {
          if (val) {
            bindLocalStorage(module)
            localStorageStatusWatchers[i]()
          }
        }, {deep: true}))
      })
      let sessionStorageStatusWatchers = []
      sessionStoreNames.forEach((module, i) => {
        sessionStorageStatusWatchers.push(store.watch(state => {
          return getData(state, module).___status
        }, val => {
          if (val) {
            bindSessionStorage(module)
            sessionStorageStatusWatchers[i]()
          }
        }, {deep: true}))
      })
      break
    default:
      localStoreNames.forEach((module, i) => {
        bindLocalStorage(module)
      })
      sessionStoreNames.forEach((module, i) => {
        bindSessionStorage(module)
      })
      if (localStoreNames.length || sessionStoreNames.length) {
        watchOtherBrowsersStorage()
      }
      break
  }
}
