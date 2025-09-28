# yokto.js

**yokto.js** is a micro JavaScript library centered around a reactive virtual DOM (vNode) engine. It provides a suite of lightweight tools for modern web development, including efficient DOM selection and manipulation, element creation, chainable APIs, HTTP clients for REST and GraphQL, WebSocket management, and client-side hash-based routing. It's designed for building dynamic applications with a minimal footprint and a clean, expressive API.
<!--
yokto.js is a micro JavaScript library with a reactive virtual DOM (vNode) engine. It provides a suite of lightweight tools for modern web development, including efficient DOM manipulation, chainable APIs, HTTP clients (REST/GraphQL), WebSockets, and client-side routing—all designed for a minimal footprint and a clean, expressive API.
-->

## Installation

Include via CDN:

```html
<script src="https://cdn.jsdelivr.net/gh/profxadke/yokto.js@main/yokto.min.js"></script>
```

Or download `yokto.js` and host locally.

## Core Concepts: The vNode Engine

At the heart of `yokto.js` is a reactive **vNode (virtual node)** engine. Instead of directly returning raw DOM elements from queries, `yokto.js` wraps them in a `vNode` object. This object is a lightweight representation of a DOM element that stays in sync with it.

- **Reactivity**: When you change a property on a `vNode` (like `vNode.attrs.id = 'new'`), the library automatically updates the actual DOM element.
- **Efficiency**: A `WeakMap`-based cache ensures that the same DOM element is always wrapped by the same `vNode` instance, preventing unnecessary work.
- **Clean API**: The `vNode` provides a consistent and powerful API for manipulation, traversal, and event handling.

---

## The `vNode` Object

A `vNode` is the fundamental building block in `yokto.js`. It has the following structure:

- `vNode.tag`: (`string`) The element's tag name (e.g., `'div'`).
- `vNode.attrs`: (`Proxy`) A reactive proxy for the element's attributes. Setting a property on `attrs` directly updates the DOM.
  ```js
  const myDiv = yokto.$('#my-div');
  myDiv.attrs.class = 'active highlighted'; // Sets the class attribute
  myDiv.attrs['data-id'] = 123; // Sets data-id="123"
  delete myDiv.attrs.id; // Removes the id attribute
  ```
- `vNode.text`: (`string`) A reactive property for the element's `textContent`.
  ```js
  const header = yokto.$('h1');
  header.text = 'Welcome to yokto.js'; // Updates the h1's text
  ```
- `vNode.children`: (`vNodeList`) A getter that returns a list of all child nodes (elements and non-empty text nodes).

### `vNode.$` - The Escape Hatch

The `$` property provides direct access to the underlying DOM element and its native properties. This is useful for interoperability with other libraries or when you need to call a native browser API.

- `vNode.$.node`: The raw DOM element (e.g., `HTMLElement`).
- `vNode.$.parent`: The parent element, returned as a `vNode`.
- `vNode.$.children`: The raw `HTMLCollection` of child elements.
- `vNode.$.isConnected`: A boolean indicating if the element is connected to the DOM.

### `vNode._` - Manipulation Methods

The `_` property is an object containing methods for direct, chainable (using trailing `_`) DOM manipulation.

- `_.addClasses(...names)`: Adds one or more CSS classes.
- `_.removeClasses(...names)`: Removes one or more CSS classes.
- `_.toggleClass(name, force)`: Toggles a CSS class.
- `_.css(styles)`: Applies inline CSS styles from an object (e.g., `{ color: 'red' }`).
- `_.on(event, handler)`: Attaches an event listener.
- `_.off(event, handler)`: Removes an event listener.
- `_.append(child)`: Appends a child (`vNode` or text string) to the element.
- `_.prepend(child)`: Prepends a child (`vNode` or text string) to the element.
- `_.remove()`: Removes the element from the DOM.

```js
const box = yokto.$('.box');
box._.addClasses('visible')._
     .css({ backgroundColor: 'blue', color: 'white' })._
     .on('click', () => alert('Box clicked!'));
```

---

## The `vNodeList` Object

A `vNodeList` is an array-like object containing multiple `vNodes`, returned by the `$$` selector. It comes with powerful methods for performing actions on the entire collection at once.

### Iteration Methods
- `each(fn)`: Executes a function for each `vNode` in the list.
- `map(fn)`: Creates a new `vNodeList` by mapping each `vNode` to a new value.
- `filter(fn)`: Creates a new `vNodeList` with `vNodes` that pass the filter function.
- `reduce(fn, initial)`: Reduces the list to a single value.

### Bulk Manipulation Methods
These methods apply the corresponding action to every `vNode` in the list.
- `addClasses(...names)`
- `removeClasses(...names)`
- `toggleClass(name, force)`
- `css(styles)`
- `on(event, handler)`
- `off(event, handler)`
- `remove()`

### Accessor Methods
- `first()`: Returns the first `vNode` in the list.
- `last()`: Returns the last `vNode` in the list.

```js
// Add the 'active' class to all list items and attach a click handler
const items = yokto.$$('li');
items.addClasses('active').on('click', (e) => {
  console.log('List item clicked:', e.target.textContent);
});
```

---

## Awesome Example: A Simple To-Do List

This example demonstrates how the core features work together to build a functional component in just a few lines of code.

```html
<!-- In your HTML file -->
<div id="app">
  <h3>My To-Do List</h3>
  <input type="text" id="todo-input" placeholder="Add a new task...">
  <button id="add-btn">Add</button>
  <ul id="todo-list"></ul>
</div>
```

```js
// In your JavaScript file
const input = $('#todo-input');
const addButton = $('#add-btn');
const list = $('#todo-list');

const addTask = () => {
  const taskText = input.$.node.value.trim();
  if (!taskText) return; // Ignore empty input

  // 1. Create a "delete" button vNode
  const deleteBtn = $v('button', {}, 'Delete');

  // 2. Create the new <li> vNode with the text and button
  const newTask = $v('li', {}, [
    taskText + ' ', // Add text content
    deleteBtn        // Add the button vNode as a child
  ]);

  // 3. Add a click event to the delete button to remove the task
  deleteBtn._.on('click', () => newTask._.remove());

  // 4. Mount the new task to the list
  _(newTask, list);

  // 5. Clear the input field
  input.$.node.value = '';
};

// Add task when the button is clicked or Enter is pressed
addButton._.on('click', addTask);
input._.on('keyup', (e) => {
  if (e.key === 'Enter') {
    addTask();
  }
});
```

---

## Full API Reference

### DOM & vNodes

#### `$(selector, useCache)`
Selects the first DOM element and returns it as a `vNode`.
- **Returns**: `vNode` or `null`.
```js
const div = yokto.$('.item'); // Single element
const items = yokto.$('.item', true); // Cached

const item = yokto.$('.item'); // Single vNode
if (item) {
  item._.addClasses('active');
  item.attrs.id = 'new-id'; // Attributes are reactive
}
```

#### `$$(selectorOrFn, useCache)`
1.  Selects all DOM elements and returns a `vNodeList`.
2.  If a function is passed, executes it on `DOMContentLoaded`.
- **Returns**: `vNodeList` or `undefined`.
```js
const items = yokto.$$('.item', true); // Cached vNodeList
items.addClasses('highlight');

yokto.$$(() => console.log('DOM is ready!'));
```

#### `$v(tag, attrs, children)`
Creates a new, unmounted `vNode`.
- `children`: Can be a string, a single `vNode`, or an array of strings/`vNodes`.
- **Returns**: `vNode`.
```js
const newDiv = yokto.$v('div', { class: 'item' }, 'Hello, vNode!');
```

#### `_(vNode, parentElement)`
Mounts a `vNode` into the DOM.
- `parentElement`: Can be a raw DOM element or another `vNode`.
- **Returns**: The mounted `vNode`.
```js
const container = yokto.$('#container');
const newDiv = yokto.$v('div', { class: 'item' }, 'Hello!');
yokto._(newDiv, container); // Appends the new div to #container
```

#### `$c(selector, index)`
A chainable API for powerful and expressive DOM manipulations. It wraps a `vNode` or `vNodeList`.
- **Chainable Methods**: `addClass`, `removeClass`, `toggleClass`, `attr`, `css`, `text`, `on`, `off`, `append`, `prepend`, `remove`, `each`, `map`, `filter`.
- **Getter Methods**: `get`, `first`, `last`, `dom` (returns raw DOM nodes).
```js
yokto.$c('.item')
    .addClass('active')
    .css({ color: 'red' })
    .text('Updated Text')
    .on('click', () => console.log('Clicked!'));
```

### HTTP & WebSockets

#### `RESTClient(method, url, options)`
A `fetch`-based HTTP client.
- `options`: `{ data, params, headers, raw, retry, timeout, verbose, logger }`.
- **Returns**: `Promise` resolving to JSON or a raw `Response` object.
```js
// Direct call
try {
    const data = await yokto.RESTClient('GET', '/api/users');
    console.log(data);
} catch (err) {
    console.error('API error:', err);
}
```

#### `RESTAdapter(baseUrl, defaultOptions)`
A factory for creating reusable `RESTClient` instances.
```js
// Using an adapter
const api = yokto.RESTAdapter('/api');
const users = await api.get('users');
const newUser = await api.post('users', { name: 'John' });
```

#### `GraphQLClient(url, { query, variables, ...opts })`
A client for making GraphQL requests.
```js
const query = `query { user(id: 1) { name } }`;
yokto.GraphQLClient('/graphql', { query }).then(data => console.log(data));
```

#### `GraphQLAdapter(baseUrl, defaultOptions)`
A factory for creating reusable `GraphQLClient` instances.
```js
const graph = yokto.GraphQLAdapter('/graphql');
const { data } = await graph.query('{ user(id: 1) { name } }');
console.log(data.user.name);
```

#### `WSClient(url, options)`
A WebSocket client with auto-reconnection logic.
- `options`: `{ onOpen, onClose, onMessage, onError, autoReconnect, ... }`.
```js
const ws = yokto.WSClient('ws://example.com', {
    onMessage: (e) => console.log('Received:', e.data),
    onReconnectFail: (err) => console.error('WS failed:', err)
});
ws.sendMessage('Hello from client');
```

### Utilities

#### `$h(route, callback)` & `$a(route)`
A simple and effective client-side hash router.
- `$h`: Defines a route and its callback. A function passed as the first argument becomes the default/404 route.
- `$a`: Programmatically navigates to a hash route.
```js
// Define routes
yokto.$h('/home', () => console.log('Home page'));
yokto.$h('/user/:id', ({ params }) => console.log(`User: ${params.id}`));
yokto.$h(({ path }) => console.log(`404: ${path} not found`)); // Default

// Navigate
yokto.$a('/home');
```

#### `$s(query, styles, index)`
A legacy utility to quickly set inline CSS styles. Prefer using `vNode._.css()` or `$c().css()`.
```js
yokto.$s('.item', { background: 'blue' }); // Styles all item classes
yokto.$s('.item', 'color: green', 0); // Style only the first item
```

#### `Logger({ verbose, prefix, level })`
A customizable logger for handling different log levels.
```js
const logger = yokto.Logger({ level: 'debug', prefix: 'MyApp' });
logger.debug('This is a debug message.');
```

#### `clearCache()`
Manually clears the LRU cache used by `$` and `$$` for DOM queries.
```
yokto.clearCache()
```

#### Miscellaneous Helpers
- `__(obj)`: Returns `true` if the input is a non-array object.
- `$dom(selector)`: A legacy selector that returns an `Array` of raw DOM nodes instead of `vNodes`.
- `$doc`, `$win`, `$loc`: Shorthand aliases for `document`, `window`, and `document.location`.

## Configuration

You can configure `yokto.js` by modifying the `yokto.config` object.

- `yokto.config.observeDOM`: If `true`, enables a `MutationObserver` to automatically clear the selector cache when the DOM changes (default: `true`).
- `yokto.config.MAX_CACHE_SIZE`: The maximum number of selectors to keep in the LRU cache (default: `100`).

## Best Practices

- **Embrace the vNode**: Whenever possible, interact with the DOM through the `vNode` API (`.attrs`, `.text`, `._` methods). Use the `vNode.$` escape hatch only when you need to work with a browser API or third-party library that requires a raw DOM node.

- **Component-like Functions**: For reusable UI elements, create functions that return a configured `vNode`. This is a lightweight way to create components.
  ```js
  const createButton = (text, onClick) => {
    const btn = $v('button', { class: 'custom-btn' }, text);
    btn._.on('click', onClick);
    return btn;
  };

  const myButton = createButton('Click Me!', () => alert('Clicked!'));
  _(myButton, $('#app'));
  ```

- **State Management**: `yokto.js` is a DOM utility, not a state management library. For simple applications, managing state in local variables is fine. For more complex apps, you can easily integrate it with dedicated state management libraries.

- **Performance and Caching**:
  - Use `useCache: true` with `$` and `$$` for selectors that are queried often and don't change (e.g., `$('#app')`).
  - Avoid caching selectors that are highly dynamic (e.g., inside a loop with changing IDs) to prevent cache churn.
  - The built-in `MutationObserver` handles most cache invalidation automatically. If you are performing complex, synchronous DOM updates that the observer might miss, you can call `yokto.clearCache()` manually.

- **Security**: Avoid setting `verbose: true` in `RESTClient` or `WSClient` options in a production environment, as it can lead to leaking sensitive request/response data to the console.

- **Error Handling**: Always wrap asynchronous operations like `RESTClient` and `GraphQLClient` in `try...catch` blocks to gracefully handle network failures or API errors.
```js
try {
    await yokto.RESTClient('GET', '/api');
} catch (err) {
    console.error('API failed:', err);
}
```

## Another Awesome Example: Fetching and Rendering API Data

This example shows how to use `RESTClient` to fetch data from a public API and dynamically render a list.

```html
<!-- In your HTML file -->
<div id="app-fetch">
  <h3>User List</h3>
  <button id="fetch-btn">Fetch Users</button>
  <ul id="user-list"></ul>
  <p id="loading-text" style="display: none;">Loading...</p>
</div>
```

```js
// In your JavaScript file
$$(() => { // Run when the DOM is ready
  const fetchBtn = $('#fetch-btn');
  const userList = $('#user-list');
  const loadingText = $('#loading-text');

  const fetchUsers = async () => {
    // Show loading indicator and disable button
    loadingText._.css({ display: 'block' });
    fetchBtn.attrs.disabled = true;
    userList.text = ''; // Clear previous list

    try {
      // Fetch data from a public API
      const users = await yokto.RESTClient('GET', 'https://jsonplaceholder.typicode.com/users');

      // Create and mount a vNode for each user
      users.forEach(user => {
        const userCard = $v('li', { class: 'user-card' }, [
          $v('h4', {}, user.name),
          $v('p', {}, `Email: ${user.email}`)
        ]);
        _(userCard, userList);
      });

    } catch (error) {
      userList.text = 'Failed to load users. Please try again.';
      console.error('API Error:', error);
    } finally {
      // Hide loading indicator and re-enable button
      loadingText._.css({ display: 'none' });
      delete fetchBtn.attrs.disabled;
    }
  };

  fetchBtn._.on('click', fetchUsers);
});
```

## Notes

- **Browser Compatibility**: `yokto.js` uses modern JavaScript (ES6+), including `Proxy` and `WeakMap`. It is not compatible with legacy browsers like IE11 without polyfills.
- **Cache**: The selector cache is an LRU (Least Recently Used) cache. If you are creating many unique selectors dynamically, consider setting `useCache=false` to avoid churning the cache. The cache is automatically cleared on hash-based route changes.
