import Crypto from 'nuxt-vuex-localstorage/plugins/crypto'
import expire from 'nuxt-vuex-localstorage/plugins/bindStorage/expire'
import Vue from 'vue'
const cloneDeep = require('lodash.clonedeep');
const setData = require('lodash.set');
const getData = require('lodash.get');

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
    const store = ctx.store
    const crypto = await new Crypto(ctx, options)
    const prefix = options.prefix || ''
    let localStoreNames = options.localStorage || []
    if (typeof options.localStorage === 'string') localStoreNames = [options.localStorage]
    let sessionStoreNames = options.sessionStorage || []
    if (typeof options.sessionStorage === 'string') sessionStoreNames = [options.sessionStorage]

    const getModuleName = module => `${prefix}${module.path}`;

    const handlerData = value => expire.check(JSON.parse(crypto.decrypt(value)));

    const prepareData = (module, value) => crypto.encrypt(JSON.stringify(expire.create(module, value)));

    const getStorageObject = () => ({
        value: null
    })

    const getCopyStoreState = () => cloneDeep(store.state)

    const watchFunction_local = (i, val) => {
        const storage = getStorageObject();
        storage.value = val
        if (localStoreNames[i].version !== undefined) storage.version = localStoreNames[i].version

        storageFunction.local.set(getModuleName(localStoreNames[i]), prepareData(localStoreNames[i], storage))
    }

    let watchHandlers_local = []
    const watcher_local = (module, i) => {
        return store.watch(
            state => getData(state, module.path),
            val => watchFunction_local(i, val),
            {deep: true}
        )
    }

    const bindLocalStorage = module => {
        const expireChecked = handlerData(storageFunction.local.get(getModuleName(module)))
        let data = getCopyStoreState()
        if (getData(store.state, module.path) !== undefined && expireChecked.value !== undefined && expireChecked.version === module.version)
            setData(data, module.path, expireChecked.value)
        store.replaceState(data)

        localStoreNames.forEach((module, i) => {
            watchHandlers_local[i] = watcher_local(module, i)
        })
    }

    const watchOtherBrowsersStorage = () => {
        window.addEventListener('storage', (event) => {
            if (!event && event.key.indexOf(prefix) !== 0) return false;
            const path = prefix.length ? event.key.slice(prefix.length): event.key;
            const module = localStoreNames.find((e) => {
                return e.path === path
            });
            if(!module) return false;
            const newData = handlerData(event.newValue).value
            if (getData(store.state, module.path) !== undefined && newData !== undefined && module.tabSync !== false) {
                let data = getCopyStoreState()
                setData(data, module.path, newData)
                if (JSON.stringify(data) !== JSON.stringify(store.state))
                    store.replaceState(data)
            }
        })
    }

    const watchFunction_session = (i, val) => {
        const storage = getStorageObject();
        storage.value = val
        storage.version = localStoreNames[i].version || null

        storageFunction.session.set(getModuleName(sessionStoreNames[i]), prepareData(localStoreNames[i], storage))
    }

    let watchHandlers_session = []
    const watcher_session = (module, i) => {
        return store.watch(
            state => getData(state, module.path),
            val => watchFunction_session(i, val),
            {deep: true})
    }

    const bindSessionStorage = module => {
        const expireChecked = handlerData(storageFunction.session.get(getModuleName(module)))
        let data = getCopyStoreState()
        if (getData(store.state, module.path) !== undefined && expireChecked.value !== undefined && expireChecked.version === module.version)
            setData(data, module.path, expireChecked.value)
        store.replaceState(data)

        sessionStoreNames.forEach((module, i) => {
            watchHandlers_session[i] = watcher_session(module, i)
        })
    }

    switch (options.mode) {
        case 'manual':
            watchOtherBrowsersLocalStorage()
            Vue.prototype.$setWebStorageKey = (key, salt, keyMixTimes, keyLength) => crypto.setKey(key, salt, keyMixTimes, keyLength)
            let localStorageStatusWatchers = []
            localStoreNames.forEach((module, i) => {
                localStorageStatusWatchers.push(store.watch(state => {
                    return getData(state, module.path).___status
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
