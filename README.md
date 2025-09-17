# yokto.js

A micro DOM utility and HTTP helper library for lightweight DOM selection/injection/manipulation, AJAX/XHR/fetch requests, WebSocket connections, and hash-based client-side routing. Designed for single-page applications (SPAs) with minimal footprint and modern JavaScript.

## Installation

Include via CDN:

```html
<script src="https://cdn.jsdelivr.net/gh/profxadke/yokto.js@main/yokto.min.js"></script>
```

Or download `yokto.js` and host locally.

## Features

- **DOM Selection**: `$` for querying elements with caching.
- **DOM Manipulation**: `$_` (universal updater), `$c` (chainable), `$s` (styles).
- **Element Creation**: `_` for creating and appending elements.
- **DOM Ready**: `$$` for executing code on DOM load.
- **HTTP Clients**: `RESTClient`, `GraphQLClient` for API calls.
- **WebSocket**: `WSClient` for real-time communication.
- **Hash Routing**: `$h` for client-side hash-based routing.
- **Logging**: `Logger` for debug/warn/error logging.
- **Cache Management**: LRU cache for DOM queries with `clearCache`.
- **Useful Shorthand Alias**: $d -> document, $w -> window

## API

### `$` - DOM Selection

Selects DOM elements with optional caching and scoping.

```js
yokto.$('selector', return_list, useCache, scope)
```

- `selector`: CSS selector (e.g., `.class`, `#id`).
- `return_list`: If `true`, returns array of elements; else single element or `null` (default: `false`).
- `useCache`: If `true`, caches query results (default: `false`).
- `scope`: DOM element to scope query (default: `document`).
- Returns: `Element`, `Element[]`, or `null`.

**Example**:

```js
const div = yokto.$('.item'); // Single element
const items = yokto.$('.item', true, true); // Cached array
const scoped = yokto.$('.child', false, false, document.querySelector('.parent'));
```

### `_` - Element Creation

Creates and appends an element to a parent.

```js
yokto._(parentSelector, tag, attrs, innerText)
```

- `parentSelector`: CSS selector of parent.
- `tag`: HTML tag name (e.g., `div`).
- `attrs`: Object of attributes (optional).
- `innerText`: Text content (coerced to string, optional).

**Example**:

```js
yokto._('#container', 'div', { class: 'item' }, 'Hello');
```

### `$$` - DOM Ready

Executes a function when the DOM is ready.

```js
yokto.$$(fn)
```

- `fn`: Function to run.

**Example**:

```js
yokto.$$(() => console.log('DOM ready'));
```

### `$_` - Universal DOM Updater

Updates DOM elements with classes, attributes, etc.

```js
yokto.$_(query, options)
```

- `query`: CSS selector.
- `options`: `{ addClasses, removeClasses, toggleClasses, setAttrs, removeAttrs, index }` or string/array for `addClasses`.
- Returns: `undefined`.

**Example**:

```js
yokto.$_('.item', { addClasses: 'active', setAttrs: { 'data-id': 1 } });
yokto.$_('.item', 'highlight'); // Shortcut for addClasses
```

### `$c` - Chainable DOM Helper

Chainable DOM selector and updater.

```js
yokto.$c(selector, index)
```

- `selector`: CSS selector.
- `index`: Optional index to target single element.
- Methods: `addClass`, `removeClass`, `toggleClass`, `attr`, `css`, `html`, `text`, `on`, `off`, `append`, `prepend`, `each`, `map`, `filter`, `get`, `first`, `refresh`.

**Example**:

```js
yokto.$c('.item')
    .addClass('active')
    .css({ color: 'red' })
    .html('<span>Updated</span>')
    .refresh()
    .on('click', () => console.log('Clicked'));
```

### `$s` - Inline Style Setter

Sets inline CSS styles.

```js
yokto.$s(query, styles, index)
```

- `query`: CSS selector.
- `styles`: Object `{ prop: value }` or string `prop: value`.
- `index`: Optional index for single element.

**Example**:

```js
yokto.$s('.item', { background: 'blue' });
yokto.$s('.item', 'color: green', 0);
```

### `$h` - Hash Router

Registers hash-based routes with callbacks.

```js
yokto.$h(route, callback)
```

- `route`: String (e.g., `/path`, `/user/:id`) or function for default route.
- `callback`: Function `({ path, params, query })` for matched route.
- Clears DOM cache on route change.

**Example**:

```js
yokto.$h('/home', ({ path, params, query }) => {
    yokto.$c('#app').html('<h1>Home</h1>');
});
yokto.$h('/user/:id', ({ path, params, query }) => {
    yokto.$c('#app').html(`<h1>User ${params.id}</h1>`);
});
yokto.$h(({ path, params, query }) => {
    yokto.$c('#app').html('<h1>Not Found</h1>');
});
```

### `RESTClient` - HTTP Client

Makes HTTP requests with retry and timeout.

```js
yokto.RESTClient(method, url, options)
```

- `method`: HTTP method (e.g., `GET`, `POST`).
- `url`: Endpoint URL.
- `options`: `{ data, params, headers, raw, retry, timeout, verbose, logger }`.
- Returns: `Promise` resolving to JSON or raw `Response`.

**Example**:

```js
try {
    const data = await yokto.RESTClient('GET', '/api/users', { params: { id: 1 } });
    console.log(data);
} catch (err) {
    console.error('API error:', err);
}
```

### `GraphQLClient` - GraphQL Client

Makes GraphQL requests via `RESTClient`.

```js
yokto.GraphQLClient(url, { query, variables, ...opts })
```

- `url`: GraphQL endpoint.
- `options`: `{ query, variables, headers, ...rest }`.

**Example**:

```js
const query = `query { user(id: 1) { name } }`;
yokto.GraphQLClient('/graphql', { query }).then(data => console.log(data));
```

### `WSClient` - WebSocket Client

Manages WebSocket connections with reconnect.

```js
yokto.WSClient(url, options)
```

- `url`: WebSocket URL.
- `options`: `{ onOpen, onClose, onMessage, onError, onReconnectFail, protocols, verbose, autoReconnect, reconnectRetries, reconnectDelay, connectTimeout }`.
- Returns: `WebSocket` with `sendMessage`, `reconnect`, `closeIntentionally`.

**Example**:

```js
const ws = yokto.WSClient('ws://example.com', {
    onMessage: (e) => console.log(e.data),
    onReconnectFail: (err) => console.error('WS failed:', err)
});
ws.sendMessage('Hello');
```

### `Logger` - Logging Utility

Customizable logger.

```js
yokto.Logger({ verbose, prefix, level })
```

- `options`: `{ verbose: boolean, prefix: string, level: 'error'|'warn'|'info'|'debug' }`.
- Returns: `{ error, warn, info, debug }`.

**Example**:

```js
const logger = yokto.Logger({ verbose: true });
logger.info('App started');
```

### `clearCache` - Clear DOM Cache

Clears cached DOM queries.

```js
yokto.clearCache()
```

**Example**:

```js
yokto._('#app', 'div'); // Mutates DOM
yokto.clearCache(); // Clear cache
```

## Configuration

- `yokto.config.observeDOM`: If `true`, enables `MutationObserver` to auto-clear cache on DOM changes (default: `true`).

## Best Practices

- **Cache Management**: Use `useCache=true` for frequent selectors, but call `yokto.clearCache()` or `$c().refresh()` after DOM mutations (e.g., via `_`, `append`, or third-party libraries).
- **Dynamic Selectors**: For unique selectors (e.g., `#id-${n}`), use `useCache=false`.
- **Error Handling**: Wrap `RESTClient` and `GraphQLClient` in try-catch:

  ```js
  try {
      await yokto.RESTClient('GET', '/api');
  } catch (err) {
      console.error('API failed:', err);
  }
  ```
- **Routing**: Define a default route with `$h` to handle unmatched hashes.
- **Security**: Avoid `verbose=true` in production to prevent logging sensitive data.
- **Performance**: Scope queries with `$('selector', false, false, container)` for large DOMs.

## Notes

- **Browser Compatibility**: Uses ES6+ (`WeakRef`, `Map`). For IE11, include polyfills (e.g., core-js).
- **Cache**: LRU cache (max 100) prevents memory growth but may evict entries in dynamic apps. Call `clearCache()` as needed.
- **Routing**: `$h` clears cache on route changes to ensure fresh DOM queries.
