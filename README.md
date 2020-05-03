# nuxt-vuex-localstorage
Make use of local and session storage more efficiently by connecting Vuex and Web storage. Different from other persist plugins, by allocating just some particular objects of Vuex, Web storage can save more space and it can also be used with existing Vuex usage.  
  
Data binding through local storage can be easily managed in multiple browser tabs.
![Alt Text](https://github.com/rubystarashe/nuxt-vuex-localstorage/raw/master/localstorage.gif)    

It provides various web storage security systems since it has strong data encrypting functionality.  
It provides ‘expireʼ function which is not supported on web storage.  
It supports “cookie mode” for some environment on which web storage is not supported, such as ‘Safari private modeʼ.

It works well in electron!

# Readme Translation
한국어 링크: <https://github.com/rubystarashe/nuxt-vuex-localstorage/blob/master/README-kor.md>

# Example
<https://github.com/rubystarashe/nuxt-vuex-localstorage-example>

# Installation
```
npm i nuxt-vuex-localstorage
```

# Default(Auto) mode

How to store multiple stores on storage and rename storage store
```js
//  nuxt.config.js
module.exports = {
  modules: [
    ['nuxt-vuex-localstorage', {
      prefix: 're_', // prefix name in localStorage and sessionStorage
      localStorage: [
        {
            path: 'tab.set', // Path to state in storage (use function https://lodash.com/docs/4.17.15#get)
            tabSync: false, // Sync between tabs, default: true
            version: 1.2, // option, Version Control, default: undefined
            expire: 1, // option, 1 = 1 hour, 12 = 12 hours, default: undefined
        }
      ],
      sessionStorage: [
        // same with localStorage
      ]
    }]
  ]
}

// store/index.js
export const state = () => ({
  foo: {
    anyValues: 0
  },
  bar: {
    anyValues: 0
  },
  sfoo: {
    anyValues: 0
  },
  sbar: {
    anyValues: 0
  }
})
```

# Manual mode
Besides web storage can be connected automatically, it can also be manually connected by setting key value.
```js
//  nuxt.config.js
module.exports = {
  modules: [
    ['nuxt-vuex-localstorage', {
      mode: 'manual'
    }]
  ]
}
```
At first, insert `__status` value (whether true or false) in store file of web storage.
```js
// store/localStorage.js or store/sessionStorage.js
export const state = () => ({
  ...
})
```
Then, it may sounds obvious, you can connect to web storage by setting status
to true any time you want to connect.  
Also, it can be connect after setting encryption key value by using $setWebStorageKey method.
```html
<script>
export default {
  mounted() {
    this.$setWebStorageKey(key, salt, keyMixTimes, keyLength)
    //  If Key or salt values are not given, these are going to be generated automatically.
    //  keyTimes: number of repetitions of the hash function. Default is set to 64
    //  keyLength: the final length of the key. Default is set to 64
  }
}
</script>
```

# Additional security option
```js
//  nuxt.config.js
module.exports = {
  modules: [
    ['nuxt-vuex-localstorage', {
      ...
      keyMixTimes: 64,  // number of repetitions of the hash function. Default is set to 64
      KeyLength: 64 // length of the digest. Default is set to 64.
    }]
  ]
}
```



# IE transpile
```js
//  nuxt.config.js
module.exports = {
  ...
  build: {
   transpile: [
      'nuxt-vuex-localstorage'
    ],
    ...
  }
}
```

# Polyfill in environment where web storage is not supported
As mentioned before, in such environment, ‘cookie modeʼ will automatically activated. Also, to reduce unnecessary data junk of store data, synchronization only happens when loading or exiting the browser. Therefore, even though cookie mode is activated, cookie doesnʼt contain store data, so it will improve the app performance.
In this mode, it has 24 hours of expiration time, thus if it is not re-activated in 24 hours, the data will reset.


# Debugging mode
Without encrypting.
```js
//  nuxt.config.js
module.exports = {
  modules: [
    ['nuxt-vuex-localstorage', {
      mode: 'debug'
    }]
  ]
}
```
