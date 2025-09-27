/**
 * yokto.js - A micro DOM utility/minimal DOM/HTTP helper library + vNode engine
 * --------------------------------------------
 * Provides ultra lightweight utilities for DOM selection, manipulation, element creation, traversal,
 * DOM ready callbacks, AJAX (fetch), and hash-based routing, now powered by a reactive vNode engine.
 *   - vNode/DOM selection: $, $$  ( or if func passed to $$ it'll run after DOMContentLoaded, see below; )
 *   - vNode Chained: $c
 *   - vNode creation: $v
 *   - Mount vNode: _
 *   - Helpers: __, _$, Logger
 *   - DOM ready: $$ (as a DOM ready function)
 *   - HTTP Clients: RESTClient, GraphQLClient, RESTAdapter, GraphQLAdapter
 *   - WebSocket Client: WSClient
 *   - Inline style helper: $s
 *   - Hash router: $h, $a
 */

// Configuration
const yokto = {
    config: {
        observeDOM: true, // Enable MutationObserver for cache invalidation
        MAX_CACHE_SIZE: 100
    }
};

/* Aliases */
const $doc = document;
const $win = window;
const $loc = $doc.location;
const n = ($win.requestAnimationFrame || (fn => setTimeout(fn, 16))).bind($win);

// Helper for object check
const __ = obj => obj !== null && typeof obj === 'object' && !Array.isArray(obj);

/* ------------------------------------------------------------------
 * vNode Engine Core
 * ------------------------------------------------------------------ */

// A cache to avoid re-wrapping the same element into a new vNode
const vNodeCache = new WeakMap();

const _toVNode = (elem) => {
  if (vNodeCache.has(elem)) {
    return vNodeCache.get(elem);
  }

  const tag = elem.tagName.toLowerCase();
  let isUpdatingFromVNode = false;
  const rawAttrs = {};

  const attrsProxy = new Proxy(rawAttrs, {
    set: (target, prop, value) => {
      if (target[prop] === value) return true;
      target[prop] = value;
      isUpdatingFromVNode = true;
      elem.setAttribute(prop, value);
      Promise.resolve().then(() => { isUpdatingFromVNode = false; });
      return true;
    },
    deleteProperty: (target, prop) => {
      if (!(prop in target)) return true;
      delete target[prop];
      isUpdatingFromVNode = true;
      elem.removeAttribute(prop);
      Promise.resolve().then(() => { isUpdatingFromVNode = false; });
      return true;
    }
  });

  const vNode = {
    tag,
    attrs: attrsProxy,
    get children() { return vNodeList(Array.from(elem.childNodes).map(node => {
        if (node.nodeType === 1) return _toVNode(node);
        if (node.nodeType === 3 && node.textContent.trim()) return node.textContent;
        return null;
      }).filter(Boolean));
    },
    $: {
      node: elem,
      get parent() { return elem.parentElement ? _toVNode(elem.parentElement) : null; },
      get children() { return elem.children; },
      get isConnected() { return elem.isConnected; }
    },
    _: {
      append: (child) => {
        isUpdatingFromVNode = true;
        const childElem = child?.$?.node || document.createTextNode(child);
        elem.append(childElem);
        Promise.resolve().then(() => { isUpdatingFromVNode = false; });
        return vNode;
      },
      prepend: (child) => {
        isUpdatingFromVNode = true;
        const childElem = child?.$?.node || document.createTextNode(child);
        elem.prepend(childElem);
        Promise.resolve().then(() => { isUpdatingFromVNode = false; });
        return vNode;
      },
      remove: () => {
        isUpdatingFromVNode = true;
        elem.remove();
        Promise.resolve().then(() => { isUpdatingFromVNode = false; });
      },
      addClasses: (...names) => {
        isUpdatingFromVNode = true;
        elem.classList.add(...names);
        Promise.resolve().then(() => { isUpdatingFromVNode = false; });
        return vNode;
      },
      removeClasses: (...names) => {
        isUpdatingFromVNode = true;
        elem.classList.remove(...names);
        Promise.resolve().then(() => { isUpdatingFromVNode = false; });
        return vNode;
      },
      toggleClass: (name, force) => {
        isUpdatingFromVNode = true;
        elem.classList.toggle(name, force);
        Promise.resolve().then(() => { isUpdatingFromVNode = false; });
        return vNode;
      },
      css: (styles) => {
        isUpdatingFromVNode = true;
        Object.assign(elem.style, styles);
        Promise.resolve().then(() => { isUpdatingFromVNode = false; });
        return vNode;
      },
      on: (event, handler) => { elem.addEventListener(event, handler); return vNode; },
      off: (event, handler) => { elem.removeEventListener(event, handler); return vNode; },
    }
  };

  Object.defineProperty(vNode, 'text', {
    get() { return elem.textContent; },
    set(newValue) {
      isUpdatingFromVNode = true;
      elem.textContent = newValue;
      Promise.resolve().then(() => { isUpdatingFromVNode = false; });
    }
  });

  const observer = new MutationObserver((mutationsList) => {
    if (isUpdatingFromVNode) return;
    for (const mutation of mutationsList) {
      if (mutation.type === 'attributes') {
        const attrName = mutation.attributeName;
        const newValue = elem.getAttribute(attrName);
        if (newValue === null) {
          if (rawAttrs[attrName] !== undefined) delete rawAttrs[attrName];
        } else {
          if (rawAttrs[attrName] !== newValue) rawAttrs[attrName] = newValue;
        }
      }
    }
  });

  observer.observe(elem, { attributes: true, childList: true, subtree: true });

  for (const attr of elem.attributes) {
    rawAttrs[attr.name] = attr.value;
  }

  vNodeCache.set(elem, vNode);
  return vNode;
};

const vNodeList = (nodes = []) => {
  const list = [...nodes];
  const methods = {
    each: (callback) => { list.forEach(callback); return list; },
    map: (callback) => vNodeList(list.map(callback)),
    filter: (callback) => vNodeList(list.filter(callback)),
    reduce: (callback, initial) => list.reduce(callback, initial),
    on: (event, handler) => { list.each(v => v._.on(event, handler)); return list; },
    off: (event, handler) => { list.each(v => v._.off(event, handler)); return list; },
    addClasses: (...names) => { list.each(v => v._.addClasses(...names)); return list; },
    removeClasses: (...names) => { list.each(v => v._.removeClasses(...names)); return list; },
    toggleClass: (name, force) => { list.each(v => v._.toggleClass(name, force)); return list; },
    css: (styles) => { list.each(v => v._.css(styles)); return list; },
    remove: () => { list.each(v => v._.remove()); return list; },
    first: () => list[0],
    last: () => list[list.length - 1],
  };
  Object.setPrototypeOf(list, methods);
  return list;
};

/* ------------------------------------------------------------------
 * Caching and DOM Selection
 * ------------------------------------------------------------------ */

class LRUCache {
    constructor(max = 100) {
        this.max = max;
        this.cache = new Map();
    }
    get(key) {
        if (!this.cache.has(key)) return undefined;
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }
    set(key, value) {
        if (this.cache.has(key)) this.cache.delete(key);
        this.cache.set(key, value);
        if (this.cache.size > this.max) {
            this.cache.delete(this.cache.keys().next().value);
        }
    }
    delete(key) { this.cache.delete(key); }
    clear() { this.cache.clear(); }
}
const _$ = new LRUCache(yokto.config.MAX_CACHE_SIZE || 100);

const o = new MutationObserver(() => _$.clear());
if (yokto.config.observeDOM && $doc && $doc.body) {
    o.observe($doc.body, { childList: true, subtree: true });
}

/**
 * Selects a single element from the DOM and returns a vNode.
 * @param {string} selector - CSS selector string
 * @param {boolean} [useCache=false] - If true, use/cache the selection for reuse
 * @returns {vNode|null} - A single vNode or null if no match
 */
const $ = (selector, useCache = false) => {
    if (useCache) {
        const cached = _$.get(selector);
        if (cached) return cached;
    }
    const elem = $doc.querySelector(selector);
    if (!elem) return null;
    const node = _toVNode(elem);
    if (useCache) _$.set(selector, node);
    return node;
};

/**
 * Selects multiple elements and returns a vNodeList, OR acts as a DOM ready handler.
 * @param {string|Function} selectorOrFn - CSS selector string OR a function to run on DOM ready
 * @param {boolean} [useCache=false] - If true, use/cache the selection for reuse
 * @returns {vNodeList|void} - A vNodeList or void if used as a DOM ready handler
 */
const $$ = (selectorOrFn, useCache = false) => {
    // DOM ready functionality
    if (typeof selectorOrFn === "function") {
        if ($doc.readyState != "loading") {
            selectorOrFn();
        } else {
            $doc.addEventListener("DOMContentLoaded", selectorOrFn, { once: true });
        }
        return;
    }

    // Selector functionality
    if (useCache) {
        const cached = _$.get(selectorOrFn);
        if (cached) return cached;
    }
    const elems = $doc.querySelectorAll(selectorOrFn);
    const nodes = vNodeList(Array.from(elems).map(elem => _toVNode(elem)));
    if (useCache) _$.set(selectorOrFn, nodes);
    return nodes;
};

/**
 * Creates a new vNode element.
 * @param {string} tag - Tag name of the element
 * @param {object} [attrs] - Attributes as a key-value pair
 * @param {string|vNode|Array<string|vNode>} [children] - Child content
 * @returns {vNode} - The new vNode
 */
const $v = (tag, attrs, children) => {
  const elem = document.createElement(tag);
  if (__(attrs)) {
    for (const key in attrs) {
      elem.setAttribute(key, attrs[key]);
    }
  }
  if (typeof children === 'string') {
    elem.innerText = children;
  } else if (Array.isArray(children)) {
    children.forEach(child => elem.append(child?.$?.node || document.createTextNode(child)));
  } else if (children) {
    elem.append(children?.$?.node || document.createTextNode(children));
  }
  return _toVNode(elem);
};

/**
 * Mounts a vNode to a parent element in the DOM.
 * @param {vNode} vNode - The vNode to mount
 * @param {Element} parentElement - The DOM element/vNode to mount to
 * @returns {vNode} - The mounted vNode
 */
const _ = (vNode, parentElement) => {
  if ( '$' in parentElement ) {
    parentElement = parentElement.$.node
  }; parentElement.append(vNode.$.node);
  return vNode;
};

/* ------------------------------------------------------------------
 * Chainable API
 * ------------------------------------------------------------------ */
const $c = (selector, index) => {
    let nodes;
    // Handle case where a vNode or vNodeList is passed directly
    if (typeof selector === 'string') {
        nodes = $$(selector);
    } else if (Array.isArray(selector)) {
        nodes = vNodeList(selector);
    } else if (selector && selector.$) { // It's a single vNode
        nodes = vNodeList([selector]);
    } else {
        nodes = vNodeList([]);
    }

    if (!nodes || !nodes.length) {
        nodes = vNodeList([]); // Ensure nodes is always a vNodeList
    }

    if (typeof index === "number") {
        nodes = (index >= 0 && index < nodes.length) ? vNodeList([nodes[index]]) : vNodeList([]);
    }

    const api = {
        addClass: (...names) => {
            nodes.addClasses(...names);
            return api;
        },
        removeClass: (...names) => {
            nodes.removeClasses(...names);
            return api;
        },
        toggleClass: (name, force) => {
            nodes.toggleClass(name, force);
            return api;
        },
        attr: (key, val) => {
            if (val === undefined && typeof key === 'string') {
                return nodes.first()?.attrs[key]; // Getter
            }
            nodes.each(v => {
                if (__(key)) {
                    for (const k in key) { v.attrs[k] = key[k]; }
                } else {
                    v.attrs[key] = val;
                }
            });
            return api;
        },
        css: (styles) => {
            nodes.css(styles);
            return api;
        },
        text: (content) => {
            if (content === undefined) {
                return nodes.reduce((acc, v) => acc + v.text, ""); // Getter
            }
            nodes.each(v => v.text = content); // Setter
            return api;
        },
        on: (evt, fn) => {
            nodes.on(evt, fn);
            return api;
        },
        off: (evt, fn) => {
            nodes.off(evt, fn);
            return api;
        },
        append: (child) => {
            const first = nodes.first();
            if (first) first._.append(child);
            return api;
        },
        prepend: (child) => {
            const first = nodes.first();
            if (first) first._.prepend(child);
            return api;
        },
        remove: () => {
            nodes.remove();
            return api;
        },
        each: (fn) => {
            nodes.each(fn);
            return api;
        },
        map: (fn) => {
            return $c(nodes.map(fn));
        },
        filter: (fn) => {
            return $c(nodes.filter(fn));
        },
        get: (idx) => (idx === undefined) ? nodes : nodes[idx],
        first: () => nodes.first(),
        last: () => nodes.last(),
        dom: () => nodes.map(v => v.$.node)
    };

    return api;
};

/* ------------------------------------------------------------------
 * Preserved Utilities
 * ------------------------------------------------------------------ */

const setStylesOnEl = (el, styles) => {
    if (typeof styles === "string") {
        const match = styles.match(/^([^:]+):\s*(.+)$/);
        if (match) {
            const [, prop, val] = match;
            n(() => el.style[prop] = val);
        }
    } else if (__(styles)) {
        n(() => {
            for (const [prop, val] of Object.entries(styles)) {
                el.style[prop] = val;
            }
        });
    }
};

const $s = (query, styles, index) => {
    const nodes = $$(query);
    if (!nodes || !nodes.length) return;

    let targetNodes = nodes;
    if (typeof index === "number") {
        if (index < 0 || index >= nodes.length) {
            throw new Error(`Invalid index ${index} for ${nodes.length} nodes`);
        }
        targetNodes = [nodes[index]].filter(Boolean);
    }

    targetNodes.forEach(vNode => {
        if (!vNode) return;
        setStylesOnEl(vNode.$.node, styles);
    });
};

const Logger = (opts = {}) => {
    const { verbose = false, prefix = "yokto", level = "info" } = opts;
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const current = levels[level] ?? 2;
    function log(lvl, ...args) {
        if (levels[lvl] <= current || verbose) {
            const header = `[${prefix}] [${lvl.toUpperCase()}] ${new Date().toISOString()}`;
            (console[lvl] || console.log)(header, ...args);
        }
    }
    return {
        error: (...a) => log("error", ...a),
        warn: (...a) => log("warn", ...a),
        info: (...a) => log("info", ...a),
        debug: (...a) => log("debug", ...a),
    };
};

const defaultLogger = Logger({ verbose: false, prefix: "yokto" });

const RESTClient = async (method, url, options = {}) => {
    const {
        data, params, headers = {}, raw = false,
        retry = 0, timeout = 0, verbose = false,
        logger = defaultLogger
    } = options;

    const log = (lvl, ...args) => {
        if (logger && logger[lvl]) logger[lvl](...args);
    };

    let fullUrl = url;
    if (params && __(params)) {
        const queryString = new URLSearchParams(params).toString();
        fullUrl += (url.includes("?") ? "&" : "?") + queryString;
    }

    const fetchWithTimeout = (signal) => {
        const fetchOptions = {
            method,
            headers: { ...headers },
            body: data ? (() => {
                try {
                    if (data instanceof FormData || data instanceof URLSearchParams) return data;
                    return JSON.stringify(data);
                } catch (err) {
                    log("error", "RESTClient: Failed to serialize body", err);
                    throw new Error("Invalid JSON data");
                }
            })() : undefined,
            signal
        };
        if (data && !fetchOptions.headers["Content-Type"] && !(data instanceof FormData)) {
            fetchOptions.headers["Content-Type"] = "application/json";
        }
        if (verbose) {
            const safeHeaders = { ...fetchOptions.headers };
            ['Authorization', 'Cookie', 'Set-Cookie'].forEach(key => {
                if (safeHeaders[key]) safeHeaders[key] = '[REDACTED]';
            });
            log("info", "REST request", { method, fullUrl, headers: safeHeaders, body: '[OMITTED for security]' });
        }
        return fetch(fullUrl, fetchOptions);
    };

    let maxAttempts = typeof retry === "number" ? retry + 1 : (retry?.attempts || 1);
    const baseDelay = retry?.delay || 300;
    const factor = retry?.factor || 1;

    let lastErr = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let controller, timer;
        try {
            controller = new AbortController();
            const signal = controller.signal;
            if (timeout > 0) timer = setTimeout(() => controller.abort(), timeout);

            const resp = await fetchWithTimeout(signal);
            if (timer) clearTimeout(timer);

            if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);

            return raw ? resp : await resp.json();
        } catch (err) {
            lastErr = err;
            if (err && err.name === 'AbortError') throw new Error('Timeout');
            log("warn", `REST attempt ${attempt} failed:`, err && err.message ? err.message : err);
            if (attempt < maxAttempts) {
                const wait = baseDelay * Math.pow(factor, attempt - 1);
                log("info", `Retrying in ${wait}ms...`);
                await new Promise(r => setTimeout(r, wait));
            }
        } finally {
            if (timer) clearTimeout(timer);
        }
    }
    log("error", "REST final failure", lastErr);
    throw lastErr;
};

const GraphQLClient = (url, { query, variables, ...opts }) => {
    if (!query) throw new Error("GraphQL query is required.");
    return RESTClient("POST", url, {
        data: { query, variables },
        headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
        ...opts
    });
};

const RESTAdapter = (baseUrl, defaultOptions = {}) => {
    const call = (method, endpoint = "", options = {}) => {
        const url = baseUrl.replace(/\/+$/, "") + "/" + endpoint.replace(/^\/+/, "");
        return RESTClient(method, url, { ...defaultOptions, ...options });
    };

    return {
        get: (endpoint, params, opts = {}) => call("GET", endpoint, { ...opts, params }),
        post: (endpoint, data, opts = {}) => call("POST", endpoint, { ...opts, data }),
        put: (endpoint, data, opts = {}) => call("PUT", endpoint, { ...opts, data }),
        patch: (endpoint, data, opts = {}) => call("PATCH", endpoint, { ...opts, data }),
        delete: (endpoint, opts = {}) => call("DELETE", endpoint, opts),
        _: (method, endpoint, opts = {}) => call(method.toUpperCase(), endpoint, opts),
    };
};

const GraphQLAdapter = (baseUrl, defaultOptions = {}) => {
    const call = (query, variables = {}, opts = {}) => {
        return GraphQLClient(baseUrl, { query, variables, ...defaultOptions, ...opts });
    };

    return {
        query: (query, variables, opts = {}) => call(query, variables, opts),
        mutate: (mutation, variables, opts = {}) => call(mutation, variables, opts),
    };
};

const WSClient = (url, options = {}) => {
    const { onOpen, onClose, onMessage, onError, onReconnectFail, protocols, verbose = false, logger = defaultLogger,
            autoReconnect = true, reconnectRetries = 5, reconnectDelay = 1000, connectTimeout = 5000 } = options;
    const log = (lvl, ...args) => { if (logger && logger[lvl]) logger[lvl](...args); };

    let ws;
    let retryCount = 0;
    let isClosedIntentionally = false;

    const connect = async () => {
        ws = new WebSocket(url, protocols);

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), connectTimeout));
        const openPromise = new Promise(resolve => ws.onopen = resolve);

        return Promise.race([timeoutPromise, openPromise]).then(() => ws).catch(err => {
            log("error", "WS connect failed", err);
            try { ws.close(); } catch(e){}
            throw err;
        });
    };

    const setupHandlers = () => {
        ws.onopen = e => {
            retryCount = 0;
            if (verbose) log("info", "WS open", url);
            onOpen?.(e);
        };
        ws.onclose = e => {
            if (verbose) log("warn", "WS closed", e);
            onClose?.(e);
            if (!isClosedIntentionally && autoReconnect && retryCount < reconnectRetries) {
                retryCount++;
                const delay = reconnectDelay * Math.pow(2, retryCount - 1);
                log("info", `WS reconnect attempt ${retryCount}/${reconnectRetries} in ${delay}ms`);
                setTimeout(init, delay);
            }
        };
        ws.onmessage = e => {
            if (verbose) log("debug", "WS message", '[SANITIZED]');
            onMessage?.(e);
        };
        ws.onerror = e => {
            log("error", "WS error", e);
            onError?.(e);
            if (autoReconnect && retryCount < reconnectRetries) {
                try { ws.close(); } catch(e){}
            }
        };
    };

    const init = async () => {
        try {
            ws = await connect();
            setupHandlers();
        } catch (err) {
            if (autoReconnect && retryCount < reconnectRetries) {
                retryCount++;
                const delay = reconnectDelay * Math.pow(2, retryCount - 1);
                log("warn", `WS initial connect failed, retry ${retryCount} in ${delay}ms`, err);
                setTimeout(init, delay);
            } else {
                onReconnectFail?.(err);
                throw err;
            }
        }
    };

    init();

    ws.sendMessage = (data) => {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(typeof data === "string" ? data : JSON.stringify(data));
            } catch (err) {
                log("error", "WS sendMessage: Failed to serialize data", err);
            }
        } else {
            log("warn", "WS sendMessage: socket not open");
        }
    };

    ws.reconnect = () => {
        isClosedIntentionally = false;
        retryCount = 0;
        try { ws.close(); } catch(e){}
        init();
    };

    ws.closeIntentionally = () => {
        isClosedIntentionally = true;
        try { ws.close(); } catch(e){}
    };

    return ws;
};

function $dom(selector, context = $doc) {
    if (typeof selector === "string") {
        return Array.from(context.querySelectorAll(selector));
    } else if (selector instanceof Node || selector instanceof Window) {
        return [selector];
    } else if (selector instanceof NodeList || Array.isArray(selector)) {
        return Array.from(selector);
    }
    return [];
}

const $h = (route, callback) => {
    const logger = yokto.defaultLogger || defaultLogger;
    const routes = $h.routes || ($h.routes = new Map());
    const log = (lvl, ...args) => logger[lvl](...args);

    if (typeof route === 'function') {
        $h.defaultRoute = route;
        return;
    }

    if (typeof route !== 'string' || typeof callback !== 'function') {
        throw new Error('Invalid route or callback');
    }

    const paramNames = [];
    const regexStr = route
        .replace(/\/:([^\/]+)/g, (_, name) => {
            paramNames.push(name);
            return '/([^\/]+)';
        })
        .replace(/\//g, '\\/')
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexStr}$`);

    routes.set(route, { regex, callback, paramNames });
    log('info', `Registered route: ${route}`);

    const handleHash = () => {
        const hash = $loc.hash.replace(/^#/, '') || '/';
        const [path, queryStr] = hash.split('?');
        const query = {};
        if (queryStr) {
            new URLSearchParams(queryStr).forEach((value, key) => {
                query[key] = value;
            });
        }

        let matched = false;
        for (const [routeKey, { regex: r, callback: cb, paramNames: pn }] of routes) {
            const match = path.match(r);
            if (match) {
                const params = {};
                pn.forEach((name, i) => {
                    params[name] = match[i + 1];
                });
                n(() => {
                    try { yokto.clearCache(); } catch(e){}
                    cb({ path, params, query });
                });
                log('debug', `Route matched: ${routeKey}`, { path, params, query });
                matched = true;
                break;
            }
        }

        if (!matched && $h.defaultRoute) {
            n(() => {
                try { yokto.clearCache(); } catch(e){}
                $h.defaultRoute({ path, params: {}, query });
            });
            log('debug', 'Default route triggered', { path, query });
        }
    };

    if (!$h.initialized) {
        $win.addEventListener('hashchange', handleHash, { passive: true });
        $$(handleHash); // Run on DOM ready
        $h.initialized = true;
        log('info', 'Hash router initialized');
    }
};

const $a = route => {
    const ec = '/'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^[${ec}]+|[${ec}]+$`, 'g');
    route = route.replace(re, '');
    if ( ! route.startsWith('/') ) { route = '/' + route };
    $loc.hash = route
}

/* ------------------------------------------------------------------
 * Exports: attach to yokto and window in a controlled, valid way
 * ------------------------------------------------------------------ */
yokto.$ = $;
yokto.$$ = $$;
yokto.__ = __;
yokto._$ = _$;
yokto.$v = $v;
yokto._ = _;
yokto.$c = $c;
yokto.$s = $s;
yokto.$h = $h;
yokto.$dom = $dom;
yokto.$doc = $doc;
yokto.$win = $win;
yokto.$loc = $loc;
yokto.$a = $a;

yokto.RESTClient = RESTClient;
yokto.RESTAdapter = RESTAdapter;
yokto.GraphQLClient = GraphQLClient;
yokto.GraphQLAdapter = GraphQLAdapter;
yokto.WSClient = WSClient;
yokto.Logger = Logger;
yokto.defaultLogger = defaultLogger;

yokto.clearCache = () => _$.clear();

if (typeof $win !== "undefined") {
    $win.yokto = yokto;
    // also expose common helpers to window for convenience
    $win.$ = $;
    $win._ = _;
    $win.$$ = $$;
    $win.$v = $v;
    $win.$c = $c;
    $win.$s = $s;
    $win.$h = $h;
    $win.$a = $a;
}
