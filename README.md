# Goal

Standardize auth logic across all Topcoder frontend apps.

This repo contains several pieces: 

1. The accounts app itself, as deployed at accounts.topcoder.com
2. The connector mini-app, as deployed at accounts.topcoder.com/connector.html
3. An npm module exposing:
  - The connector-wrapper module that provides 
  - A library of shared auth functionality (token handling, etc)
  
# Using Connector in your app

## Install

```
> npm install --save tc-accounts
```

## Configure

The connector exports a ``configureConnector`` method that **must** be invoked before any of the other methods, which likely means the entry of your app, or the entry of your auth logic. This will create and attach the connector ``iFrame`` to the DOM in your app.

```javascript
import { configureConnector } from 'tc-accounts'

configureConnector({
  connectorUrl: 'https://accounts.topcoder.com/connector.html',
  frameId: 'tc-accounts-iframe'
})
```

## Use



```javascript
import { getFreshToken } from 'tc-accounts'

getFreshToken().then( token => {
  console.log(token)
})
```

## API Reference

- **getFreshToken()** - Returns a promise for a token. Under the hood it will take care of refreshing your token as needed. Works perfectly with ``angular-jwt``

```javascript
const config = function($httpProvider, jwtInterceptorProvider) {
  function jwtInterceptor() {
    return getFreshToken()
  }

  jwtInterceptorProvider.tokenGetter = jwtInterceptor

  $httpProvider.interceptors.push('jwtInterceptor')
}
```

- **logout()** - Log out of all Topcoder apps. Returns a Promise.
- **isTokenExpired(token, offsetSeconds = 0)** - Returns whether or not a given JWT is expired. Accepts an offset in seconds.
- **decodeToken(token)** - Returns the contents of a JWT as a javascript object

# Contributing

## Getting Started
If you only need to work on the app itself, getting up and running is super simple.
```
> npm install
> npm run dev
```
- Browse to ``localhost:3100``

## Testing integration locally
If you need to test your integration locally, you'll need a few more steps. The iframe technique we are using here does not play well with webpack-dev-server, and we need to serve two apps from the same subdomain (port, in this case).

```
> npm install
> npm run build:dev
> npm run build:connector
```
- Ensure that you have an alias for ``local.topcoder-dev.com`` to ``127.0.0.1`` in your hosts file
- Serve the ``dist`` directory on port 8000. We suggest ``python -m SimpleHTTPServer`` if you're on OS X.
- Point whatever app you're trying to integrate locally to ``http://local.topcoder-dev.com:8000`` to develop.
- You should now be able to browse to ``http://local.topcoder-dev.com:8000`` to see your local version of the accounts app

You'll need to rerun the ``build:dev`` and ``build:connector`` commands manually to see your updates.

© 2017 Topcoder. All Rights Reserved
