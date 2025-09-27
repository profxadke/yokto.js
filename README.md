# yokto.js

A micro JavaScript library centered around a reactive virtual DOM (vNode) engine. It provides a suite of lightweight tools for modern web development, including efficient DOM selection and manipulation, element creation, chainable APIs, HTTP clients for REST and GraphQL, WebSocket management, and client-side hash-based routing. It's designed for building dynamic applications with a minimal footprint.

## Features

- **vNode Engine**: A reactive virtual DOM system that syncs with the real DOM.
- **DOM Selection**: `$` and `$$` for querying elements and wrapping them in reactive vNodes.
- **vNode Creation**: `$v` to create new vNode elements from scratch.
- **DOM Mounting**: `_` to mount vNodes into the DOM.
- **Chainable API**: `$c` for expressive, chainable DOM manipulation on vNodes.
- **DOM Ready**: `$$` for executing code when the DOM is loaded.
- **HTTP Clients**: `RESTClient`, `GraphQLClient`, and factory adapters (`RESTAdapter`, `GraphQLAdapter`) for API calls.
- **WebSocket**: `WSClient` for real-time communication.
- **Hash Routing**: `$h` for client-side hash routing, and `$a` for navigation.
- **Logging**: `Logger` for customizable debug/warn/error logging.
- **Helpers**: `__` for object checks, `$s` for inline styles.
- **Useful Shorthand Aliases**: `$doc` -> `document`, `$win` -> `window`, `$loc` -> `document.location`.

## API

### `$` - vNode Selection

Selects the first DOM element matching the selector and returns it as a reactive `vNode`.

```js
yokto.$(selector, useCache)
```

- `selector`: CSS selector (e.g., `.class`, `#id`).
- `useCache`: If `true`, caches the query result (default: `false`).
- Returns: A single `vNode` object or `null` if no element is found.

**Example**:

```js
const item = yokto.$('.item'); // Single vNode
if (item) {
  item._.addClasses('active');
  item.attrs.id = 'new-id'; // Attributes are reactive
}
```

### `$$` - vNode List Selection / DOM Ready

Selects all DOM elements matching the selector and returns them as a `vNodeList`, OR executes a function when the DOM is ready.

```js
yokto.$$(selector, useCache)
yokto.$$(callback)
```

- `selector`: CSS selector.
- `useCache`: If `true`, caches the query result (default: `false`).
- `callback`: A function to execute when `DOMContentLoaded` fires.
- Returns: A `vNodeList` (an array-like object with extra methods) or `undefined` if used as a DOM ready handler.

**Example**:

```js
const items = yokto.$$('.item', true); // Cached vNodeList
items.addClasses('highlight');

yokto.$$(() => console.log('DOM is ready!'));
```

### `$v` - vNode Creation

Creates a new, unmounted `vNode` element.

```js
yokto.$v(tag, attrs, children)
```

- `tag`: HTML tag name (e.g., `div`).
- `attrs`: Object of attributes (optional).
- `children`: A string, a single `vNode`, or an array of strings/vNodes (optional).

**Example**:

```js
const newDiv = yokto.$v('div', { class: 'item' }, 'Hello, vNode!');
```

### `_` - Mount vNode

Mounts a `vNode` to a parent DOM element.

```js
yokto._(vNode, parentElement)
```

- `vNode`: The `vNode` to mount (created with `$v` or selected with `$`).
- `parentElement`: The native DOM element or `vNode` to append the child to.

**Example**:

```js
const container = yokto.$('#container');
const newDiv = yokto.$v('div', { class: 'item' }, 'Hello!');
yokto._(newDiv, container); // Appends the new div to #container
```

### `$c` - Chainable vNode Helper

A chainable API for performing actions on a `vNode` or `vNodeList`.

```js
yokto.$c(selector, index)
```

- `selector`: A CSS selector string, a `vNode`, or a `vNodeList`.
- `index`: Optional index to target a single element from a list.
- **Chainable Methods**: `addClass`, `removeClass`, `toggleClass`, `attr`, `css`, `text`, `on`, `off`, `append`, `prepend`, `remove`, `each`, `map`, `filter`.
- **Getter Methods**: `get`, `first`, `last`, `dom`.

**Example**:

```js
yokto.$c('.item')
    .addClass('active')
    .css({ color: 'red' })
    .text('Updated Text')
    .on('click', () => console.log('Clicked!'));

const firstItemNode = yokto.$c('.item').first();
```

### `$s` - Inline Style Setter

A utility to quickly set inline CSS styles on elements.

```js
yokto.$s(query, styles, index)
```

- `query`: CSS selector.
- `styles`: An object `{ prop: value }` or a string `prop: value`.
- `index`: Optional index to target a single element in a multi-element query.

**Example**:

```js
yokto.$s('.item', { background: 'blue' });
yokto.$s('.item', 'color: green', 0); // Style only the first item
```

### `$h` & `$a` - Hash Router

`$h` registers hash-based routes, and `$a` triggers navigation.

```js
yokto.$h(route, callback)
yokto.$a(route)
```

- `route`: For `$h`, a string like `/path` or `/user/:id`. For `$a`, the path to navigate to.
- `callback`: A function `({ path, params, query })` that runs when a route matches.
- A default route can be set by passing a function as the first argument to `$h`.

**Example**:

```js
// Define routes
yokto.$h('/home', () => console.log('Home page'));
yokto.$h('/user/:id', ({ params }) => console.log(`User: ${params.id}`));
yokto.$h(({ path }) => console.log(`404: ${path} not found`)); // Default

// Navigate
yokto.$a('/home');
```

### `RESTClient` & `RESTAdapter`

A `fetch`-based HTTP client with retry and timeout logic, and an adapter for creating reusable instances.

```js
yokto.RESTClient(method, url, options)
yokto.RESTAdapter(baseUrl, defaultOptions)
```

**Example**:

```js
// Direct call
try {
    const data = await yokto.RESTClient('GET', '/api/users');
    console.log(data);
} catch (err) {
    console.error('API error:', err);
}

// Using an adapter
const api = yokto.RESTAdapter('/api');
const users = await api.get('users');
const newUser = await api.post('users', { name: 'John' });
```

### `GraphQLClient` & `GraphQLAdapter`

A client for making GraphQL requests, and an adapter for convenience.

```js
yokto.GraphQLClient(url, { query, variables, ...opts })
yokto.GraphQLAdapter(baseUrl, defaultOptions)
```

**Example**:

```js
const gqlApi = yokto.GraphQLAdapter('/graphql');
const { data } = await gqlApi.query('{ user(id: 1) { name } }');
console.log(data.user.name);
```

### `WSClient` - WebSocket Client

A wrapper for WebSocket connections that handles auto-reconnection.

```js
yokto.WSClient(url, options)
```

- `options`: `{ onOpen, onClose, onMessage, onError, autoReconnect, ... }`.
- Returns a `WebSocket` instance with added `sendMessage`, `reconnect`, and `closeIntentionally` methods.

**Example**:

```js
const ws = yokto.WSClient('ws://example.com', {
    onMessage: (e) => console.log('Received:', e.data)
});
ws.sendMessage('Hello from client');
```

### `Logger` - Logging Utility

A customizable logger for handling different log levels.

```js
yokto.Logger({ verbose, prefix, level })
```

**Example**:

```js
const logger = yokto.Logger({ level: 'debug', prefix: 'MyApp' });
logger.debug('This is a debug message.');
```

### `clearCache` - Clear DOM Cache

Clears the LRU cache used by `$` and `$$` for DOM queries.

```js
yokto.clearCache()
```

## Configuration

You can configure `yokto.js` by modifying the `yokto.config` object.

- `yokto.config.observeDOM`: If `true`, enables a `MutationObserver` to automatically clear the selector cache when the DOM changes (default: `true`).
- `yokto.config.MAX_CACHE_SIZE`: The maximum number of selectors to keep in the LRU cache (default: `100`).

## Best Practices

- **vNode Reactivity**: Modify element attributes directly on the `vNode.attrs` proxy to automatically update the DOM. Use `vNode._` methods for other manipulations like adding classes or changing styles.
- **Immutability vs. Mutability**: For complex UI updates, it can be easier to create a new vNode with `$v` and replace an old one, rather than performing many small mutations.
- **Error Handling**: Always wrap `RESTClient` and `GraphQLClient` calls in `try...catch` blocks to handle network or server errors.
- **Routing**: Always define a default route with `$h` to gracefully handle unmatched hash URLs.

## Notes

- **Browser Compatibility**: `yokto.js` uses modern JavaScript (ES6+), including `Proxy` and `WeakMap`. It is not compatible with legacy browsers like IE11 without polyfills.
- **Cache**: The selector cache is an LRU (Least Recently Used) cache. If you are creating many unique selectors dynamically, consider setting `useCache=false` to avoid churning the cache. The cache is automatically cleared on hash-based route changes.