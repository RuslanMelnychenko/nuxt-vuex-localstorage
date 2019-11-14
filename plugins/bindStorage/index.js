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
  let localStoreNames = options.localStorage || ['localStorage']
  if (typeof options.localStorage === 'string') localStoreNames = [options.localStorage]
  let sessionStoreNames = options.sessionStorage || ['sessionStorage']
  if (typeof options.sessionStorage === 'string') sessionStoreNames = [options.sessionStorage]
  const versionPropName = options.versionPropName || '__version'

  const watchFunction_local = (i, val) => {
    const data = JSON.stringify(expire.create(val))
    storageFunction.local.set(localStoreNames[i], crypto.encrypt(data))
  }

  const getData = (data, name) => {
    try {
      const split = name.split('/', 2);
      if (split.length > 1)
        return data[split[0]][split[1]];
      else
        return data[split[0]];
    } catch (e) {
    }
    return {};
  }

  const setData = (data, name, value) => {
    try {
      const split = name.split('/', 2);
      if (split.length > 1)
        return data[split[0]][split[1]] = value;
      else
        return data[split[0]] = value;
    } catch (e) {
    }
    return {};
  }

  const getCopyStore = () => {
    return JSON.parse(JSON.stringify(store.state))
  }

  let watchHandlers_local = []
  const watcher_local     = (name, i) => {
    return store.watch(state => {
        return getData(state, name)
      },
      val => watchFunction_local(i, val),
      {deep: true})
  }

  const bindLocalStorage = name => {
    const localPersist  = JSON.parse(crypto.decrypt(storageFunction.local.get(name)))
    let data            = getCopyStore()
    const expireChecked = expire.check(localPersist)
    if (getData(store.state, name) && expireChecked[versionPropName] === getData(store.state, name)[versionPropName])
      setData(data, name, {...getData(data, name), ...expireChecked, ___status: true})
    store.replaceState(data)

    localStoreNames.forEach((name, i) => {
      watchHandlers_local[i] = watcher_local(name, i)
    })
  }

  const watchOtherBrowsersStorage = () => {
    window.addEventListener('storage', (event) => {
      if (event && getData(store.state, event.key) && getData(store.state, event.key).__tabSync !== false) {
        console.group('addEventListener(storage)')
        let data = getCopyStore()
        setData(data, event.key, expire.check(JSON.parse(crypto.decrypt(event.newValue))))
        if (JSON.stringify(data) !== JSON.stringify(store.state))
          store.replaceState(data)
        console.groupEnd()
      }
    })
  }

  const watchFunction_session = (i, val) => {
    const data = JSON.stringify(expire.create(val))
    storageFunction.session.set(sessionStoreNames[i], crypto.encrypt(data))
  }

  let watchHandlers_session = []
  const watcher_session     = (name, i) => {
    return store.watch(state => {
        return getData(state, name)
      },
      val => watchFunction_session(i, val),
      {deep: true})
  }

  const bindSessionStorage = name => {
    const sessionPersist = JSON.parse(crypto.decrypt(storageFunction.session.get(name)))
    let data             = getCopyStore()
    const expireChecked  = expire.check(sessionPersist)
    if (getData(store.state, name) && expireChecked[versionPropName] === getData(store.state, name)[versionPropName])
      setData(data, name, {...getData(data, name), ...expireChecked, ___status: true})
    store.replaceState(data)

    sessionStoreNames.forEach((name, i) => {
      watchHandlers_session[i] = watcher_session(name, i)
    })
  }

  switch (options.mode) {
    case 'manual':
      watchOtherBrowsersLocalStorage()
      Vue.prototype.$setWebStorageKey = (key, salt, keyMixTimes, keyLength) => crypto.setKey(key, salt, keyMixTimes, keyLength)
      let localStorageStatusWatchers  = []
      localStoreNames.forEach((name, i) => {
        localStorageStatusWatchers.push(store.watch(state => {
          return getData(state, name).___status
        }, val => {
          if (val) {
            bindLocalStorage(name)
            localStorageStatusWatchers[i]()
          }
        }, {deep: true}))
      })
      let sessionStorageStatusWatchers = []
      sessionStoreNames.forEach((name, i) => {
        sessionStorageStatusWatchers.push(store.watch(state => {
          return state.sessionStorage
        }, val => {
          if (val.___status) {
            bindSessionStorage(name)
            sessionStorageStatusWatchers[i]()
          }
        }, {deep: true}))
      })
      break
    default:
      localStoreNames.forEach((name, i) => {
        bindLocalStorage(name)
      })
      sessionStoreNames.forEach((name, i) => {
        bindSessionStorage(name)
      })
      if (localStoreNames.length || sessionStoreNames.length) {
        watchOtherBrowsersStorage()
      }
      break
  }
}
