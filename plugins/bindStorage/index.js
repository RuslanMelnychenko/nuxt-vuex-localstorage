import Crypto from 'nuxt-vuex-localstorage/plugins/crypto'
import Vue from 'vue'

let storageFunction

try {
  const storage = {
    local: window.localStorage,
    session: window.sessionStorage
  }
  storage.local.setItem('local_test', 1)
  storage.local.removeItem('local_test')
  storage.session.setItem('session_test', 1)
  storage.session.removeItem('session_test')

  storageFunction = require('nuxt-vuex-localstorage/plugins/bindStorage/webStorage')
} catch (e) {
  storageFunction = require('nuxt-vuex-localstorage/plugins/bindStorage/cookie')
}

export default async (ctx, options) => {
  const store = ctx.store
  const crypto = await new Crypto(ctx, options)
  
  const bindLocalStorage = () => {
    const localPersist = JSON.parse(crypto.decrypt(storageFunction.localStorage.get('store')))
    storageFunction.localStorage.expireCheck(localPersist)
    store.replaceState({
      ...store.state,
      localStorage: { ...store.state.localStorage, ...localPersist, status: true}
    })
    let watcher = store.watch(state => { return state.localStorage }, val => storageFunction.localStorage.set(val), { deep: true, immediate: true })
    window.addEventListener('storage', (event) => {
      if (event.storageArea === localStorage) {
        watcher()
        store.replaceState({ ...store.state, localStorage: JSON.parse(crypto.decrypt(event.newValue)) })
        watcher = store.watch(state => { return state.localStorage }, val => storageFunction.localStorage.set(val), { deep: true })
      }
    })
  }

  const bindSessionStorage = () => {
    const sessionPersist = JSON.parse(crypto.decrypt(storageFunction.sessionStorage.get('store')))
    store.replaceState({ 
      ...store.state,
      sessionStorage: { ...store.state.sessionStorage, ...sessionPersist, status: true}
    })
    store.watch(state => { return state.sessionStorage }, val => storageFunction.sessionStorage.set(val), { deep: true })
  }
  
  switch (options.mode) {
    case 'manual':
      Vue.prototype.$setWebStorageKey = (key, salt, keyMixTimes, keyLength) => crypto.setKey(key, salt, keyMixTimes, keyLength)
      const localStorageWatcher = store.watch(state => { return state.localStorage }, val => {
        if (val.status) {
          bindLocalStorage()
          localStorageWatcher()
        }
      }, { deep: true })
      const sessionStorageWatcher = store.watch(state => { return state.sessionStorage }, val => {
        if (val.status) {
          bindSessionStorage()
          sessionStorageWatcher()
        }
      }, { deep: true })
      break
    default:
      bindLocalStorage()
      bindSessionStorage()
      break
  }
}