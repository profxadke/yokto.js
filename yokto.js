/**
 * yokto.js - A micro DOM utility/minimal DOM/HTTP helper library + DOM updater
 * --------------------------------------------
 * Provides ultra lightweight utilities for DOM selection, manipulation, element creation, traversal,
 * DOM ready callbacks, AJAX (fetch), and hash-based routing.
 *   - DOM selection: $
 *   - Helpers: __, _$, Logger
 *   - Create element and append function: _
 *   - DOM ready: $$
 *   - DOM updater: $_
 *   - HTTP Clients: RESTClient, GraphQLClient, RESTAdapter, GraphQLAdapter
 *   - WebSocket Client: WSClient
 *   - Inline style helper: $s
 *   - Chained DOM selector and updater: $c
 *   - Element creation: $t
 *   - Hash router: $h
 *
 * TODO: use vnode(t, a{}, c[])| t: tag<string>; attrs<object>; children<array>([string|vnode]) - for $t, _ and a func. to return vnode(s) from $
 *
 * ALIAS: $doc: document object, $win: window object, $loc: location, $dom: real dom
 *
 * API:
 *   __(obj) -> Checks if obj is an associative array (dict in Python)
 *
 *   _(parentSelector, tag, attrs, innerText) -> Creates and appends element on parent element selected via querySelector
 *
 *   $$(fn) -> Executes fn when DOM is ready
 *
 *   _$ -> Holds DOM Query Selection Cache
 *     - get: Get's DOM Element from (if in) Cache
 *     - set: Set to Cache a DOM element mapped with its querySelector
 *     - delete: Delete the Cached DOM element mapped to querySelector
 *     - clear: clear DOM element cache
 *
 *   $(selector, return_list, useCache, scope) -> Selects elements
 *     - returns single element if only one match or return_list == false
 *     - returns array of elements if multiple matches and return_list == true
 *     - useCache: if true, caches/reuses selection
 *     - scope: optional DOM element to scope query (defaults to document)
 *
 *   $_(query, options|string|array) -> Universal DOM updater
 *     - addClasses: string|array
 *     - removeClasses: string|array
 *     - toggleClasses: string|array
 *     - setAttrs: { key: value }
 *     - removeAttrs: string|array
 *     - index: number (optional, target only one element)
 *     - If `options` is a string or array, defaults to addClasses
 *
 *   $s(query, styles, index) -> Inline CSS/Style setter
 *
 *   $c(query, index) -> Chained version of $ and $_ combined
 *     - addClass, removeClass, toggleClass
 *     - attr: string|array|object  - if string/array it removes attrs, but key-value pair sets the attribute
 *     - css: string
 *     - html: string
 *     - text: string
 *     - on: event, function
 *     - off: event, function
 *     - prepend: child|node
 *     - append: child|node
 *     - each: function
 *     - map: function
 *     - filter: function
 *     - get: returns nodes
 *     - first: returns first node
 *     - refresh: refreshes dom element
 *
 *   $t(tag, attrs, innerText) -> Returns a DOM ready html-node object
 *     - tag: string ( name of tag, e.g., div, h1, etc. )
 *     - attrs: object ( key: value pair of attributes for the tag )
 *     - innerText: string ( optional, innerText if any for the tag )
 *
 *   $h(route, callback) -> Registers hash-based route with callback
 *     - route: string (e.g., '/path', '/user/:id') or callback for default route
 *     - callback: function({ path, params, query })
 *
 *   $a(route) -> Redirects / Teleports window.hash to provided route
 *     - route: string  (e.g., <button onclick="$a('anotherPage')">Next Page</button>)
 *
 *   RESTClient() -> HTTP REST Client
 *
 *   RESTAdapter(baseUrl, defaultOptions) -> HTTP REST Client Adapter for ease
 *     - baseUrl: string
 *     - defaultOptions: object default options like headers, timeout, etc. [see RESTClient]
 *     - returns: .get, .post, .put, .patch, .delete, and ._ for custom or manual HTTP method
 *
 *   GraphQLClient() -> GraphQL Client
 *
 *   GraphQLAdapter(baseUrl, defaultOptions) -> GraphQL Client Adpter
 *     - baseUrl: string
 *     - defaultOptions: object default options like headers (on GraphQLClient Object)
 *     - returns: client with .query, and .mutate
 *
 *   WSClient() -> WebSocket Client
 *
 *   clearCache() -> Clears cached DOM selections
 *
 *   config{} -> Configuration object { observeDOM: boolean, MAX_CACHE_SIZE: integer }
 *
 *   TAG: <script src="https://cdn.jsdelivr.net/gh/profxadke/yokto.js@main/yokto.min.js"></script>
 */

// Configuration
const yokto = {
    config: {
        observeDOM: true, // Enable MutationObserver by default
        MAX_CACHE_SIZE: 100
    }
};

/* Aliases */
const $doc = document;
const $win = window;
const $loc = $doc.location;
const n = ($win.requestAnimationFrame || (fn => setTimeout(fn, 16))).bind($win);

// LRU Cache for $ selections (selector -> WeakRef(nodes array))
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
    delete(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
}
const _$ = new LRUCache(yokto.config.MAX_CACHE_SIZE || 100);

// Optional MutationObserver for cache invalidation
const o = new MutationObserver(() => _$.clear());
if (yokto.config.observeDOM && $doc && $doc.body) {
    o.observe($doc.body, { childList: true, subtree: true });
}

/**
 * Select elements from DOM.
 * @param {string} query - CSS selector string
 * @param {boolean} [return_list=false] - if true, return all matching elements as array
 * @param {boolean} [useCache=false] - if true, use/cache the selection for reuse
 * @param {Document|Element} [scope=document] - DOM element to scope query
 * @returns {Element|Element[]|null} - a single Element, array of Elements, or null if no matches
 */
const $ = (query, return_list = false, useCache = false, scope = $doc) => {
    if (useCache) {
        const cachedRef = _$.get(query);
        if (cachedRef) {
            const cached = cachedRef.deref();
            if (cached) {
                if (cached.length === 1 && !return_list) {
                    return cached[0];
                }
                return cached;
            }
            // Clean stale WeakRef
            _$.delete(query);
        }
    }
    let elems;
    try {
        elems = scope.querySelectorAll(query);
    } catch (err) {
        throw new Error(`Invalid CSS selector: ${query} or Scope: ${scope} doesn't contain querySelectorAll`);
    }
    if (elems.length === 0 && !return_list) {
        return null; // Prevent undefined errors
    }
    const nodes = Array.from(elems).filter(el => el instanceof Element);
    if (useCache) {
        _$.set(query, new WeakRef(nodes));
    }
    if (elems.length === 1 && !return_list) {
        return nodes[0];
    }
    return nodes;
};

/**
 * Check if object is an associative Array (dict from py)
 * @param {any} obj
 * @returns {boolean} true if object is an associative array, object with key-value pair
 */
const __ = obj => {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
};

// Shared helpers for DRY (used by $_ and $c)
const addClassesToEl = (el, cls) => {
    if (typeof cls !== 'string' && !Array.isArray(cls)) return;
    const clsArr = Array.isArray(cls) ? cls : String(cls).split(/\s+/).filter(Boolean);
    n(() => el.classList.add(...clsArr));
};

const removeClassesFromEl = (el, cls) => {
    if (typeof cls !== 'string' && !Array.isArray(cls)) return;
    const clsArr = Array.isArray(cls) ? cls : String(cls).split(/\s+/).filter(Boolean);
    n(() => el.classList.remove(...clsArr));
};

const toggleClassesOnEl = (el, cls) => {
    if (typeof cls !== 'string' && !Array.isArray(cls)) return;
    const clsArr = Array.isArray(cls) ? cls : String(cls).split(/\s+/).filter(Boolean);
    n(() => clsArr.forEach(c => el.classList.toggle(c)));
};

const setAttrsOnEl = (el, attrs) => {
    if (!__(attrs)) return;
    n(() => {
        for (const [k, v] of Object.entries(attrs)) {
            el.setAttribute(k, v);
        }
    });
};

const removeAttrsFromEl = (el, attrs) => {
    if (typeof attrs !== 'string' && !Array.isArray(attrs)) return;
    const attrArr = Array.isArray(attrs) ? attrs : [attrs];
    n(() => attrArr.forEach(attr => el.removeAttribute(attr)));
};

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


/**
 * Create and returns a newly DOM-ready element
 * @param {string} tag - tag name of element/node to be returned
 * @param {object} [attrs] - attributs as key: value pair
 * @param {string} [innerText] - optional inner text content
 */
const $t = ( tag, attrs, innerText ) => {
    let elem = $doc.createElement(tag);
    if (__(attrs)) {
        for (let key in attrs) {
            if (Object.prototype.hasOwnProperty.call(attrs, key)) {
                elem.setAttribute(key, attrs[key]);
            }
        }
    }
    if (innerText != null) {
        elem.innerText = String(innerText);
    }; return elem
}

/**
 * Create and append a new element inside parent element.
 * @param {string} parentSelector - CSS selector of parent
 * @param {string} tag - tag name of element to create
 * @param {object} [attrs] - attributes as key:value
 * @param {any} [innerText] - optional inner text content (coerced to string)
 */
const _ = (parentSelector, tag, attrs, innerText) => {
    const parentElem = $(parentSelector);
    if (!parentElem) {
        throw new Error(`Parent Node/Element Doesn't Exist for selector: ${parentSelector}`);
    }
    const elem = $t(tag, attrs, innerText);
    parentElem.appendChild(elem);
};

/**
 * Run a function when DOM is ready.
 * @param {Function} fn - function to execute
 */
const $$ = (fn) => {
    if (typeof fn !== "function") {
        throw new Error("Argument passed to ready should be a function.");
    }

    if ($doc.readyState != "loading") {
        fn();
    } else if ($doc.addEventListener) {
        $doc.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
        $doc.attachEvent("onreadystatechange", function () {
            if ($doc.readyState != "loading") fn();
        });
    }
};

/**
 * Universal DOM element updater
 * @param {string} query - CSS selector
 * @param {object} options - {
 *   addClasses: string|array,
 *   removeClasses: string|array,
 *   toggleClasses: string|array,
 *   setAttrs: { key: value },
 *   removeAttrs: string|array,
 *   index?: number
 * }
 */
const $_ = (query, options = {}) => {
    // Shortcut: if string/array passed, assume addClasses
    if (typeof options === "string" || Array.isArray(options)) {
        options = { addClasses: options };
    }

    let nodes = $(query, true);
    if (!nodes || !nodes.length) return;

    if (!Array.isArray(nodes)) nodes = [nodes];
    if (typeof options.index === "number") {
        if (options.index < 0 || options.index >= nodes.length) {
            throw new Error(`Invalid index ${options.index} for ${nodes.length} nodes`);
        }
        nodes = [nodes[options.index]].filter(Boolean);
    }

    nodes.forEach(el => {
        if (!el) return;
        if (options.addClasses) addClassesToEl(el, options.addClasses);
        if (options.removeClasses) removeClassesFromEl(el, options.removeClasses);
        if (options.toggleClasses) toggleClassesOnEl(el, options.toggleClasses);
        if (options.setAttrs) setAttrsOnEl(el, options.setAttrs);
        if (options.removeAttrs) removeAttrsFromEl(el, options.removeAttrs);
    });
};

/**
 * Inline style setter
 * @param {string} query - CSS selector
 * @param {object|string} styles - object of {prop: value} OR string "prop: value"
 * @param {number} [index] - optional single element index
 */
const $s = (query, styles, index) => {
    let nodes = $(query, true);
    if (!nodes || !nodes.length) return;

    if (!Array.isArray(nodes)) nodes = [nodes];
    if (typeof index === "number") {
        if (index < 0 || index >= nodes.length) {
            throw new Error(`Invalid index ${index} for ${nodes.length} nodes`);
        }
        nodes = [nodes[index]].filter(Boolean);
    }

    nodes.forEach(el => {
        if (!el) return;
        setStylesOnEl(el, styles);
    });
};

/**
 * Logger
 * @param {object} [opts] - { verbose: boolean, prefix: string, level: string }
 * @returns {object} - { error, warn, info, debug }
 */
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

/**
 * REST API client
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} url - endpoint URL
 * @param {object} [options] - { data, params, headers, raw, retry, timeout, verbose, logger }
 * @returns {Promise<object|Response>} - JSON response, raw Response, or error
 */
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
                    // allow FormData/URLSearchParams passthrough
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

/**
 * GraphQL client
 * @param {string} url - GraphQL endpoint
 * @param {object} options - { query, variables, headers, ...rest }
 * @returns {Promise<object>} - parsed JSON response
 */
const GraphQLClient = (url, { query, variables, ...opts }) => {
    if (!query) throw new Error("GraphQL query is required.");
    return RESTClient("POST", url, {
        data: { query, variables },
        headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
        ...opts
    });
};

/**
 * RESTAdapter - returns a client bound to a base URL
 * @param {string} baseUrl - base URL for all requests
 * @param {object} [defaultOptions] - default options like headers, timeout, etc.
 * @returns {object} - client with .get, .post, .put, .patch, .delete, and ._ for custom HTTP or manual HTTP method invocation
 */
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

/**
 * GraphQLAdapter - returns a client bound to a GraphQL endpoint
 * @param {string} baseUrl - GraphQL endpoint
 * @param {object} [defaultOptions] - default options like headers
 * @returns {object} - client with .query and .mutate
 */
const GraphQLAdapter = (baseUrl, defaultOptions = {}) => {
    const call = (query, variables = {}, opts = {}) => {
        return GraphQLClient(baseUrl, { query, variables, ...defaultOptions, ...opts });
    };

    return {
        query: (query, variables, opts = {}) => call(query, variables, opts),
        mutate: (mutation, variables, opts = {}) => call(mutation, variables, opts),
    };
};

/**
 * WebSocket wrapper
 * @param {string} url - WebSocket server URL
 * @param {object} [options] - { onOpen, onClose, onMessage, onError, onReconnectFail, protocols, verbose, autoReconnect, reconnectRetries, reconnectDelay, connectTimeout }
 * @returns {WebSocket} - WebSocket instance with sendMessage and reconnect methods
 */
const WSClient = (url, options = {}) => {
    const { onOpen, onClose, onMessage, onError, onReconnectFail, protocols, verbose = false, logger = defaultLogger,
            autoReconnect = true, reconnectRetries = 5, reconnectDelay = 1000, connectTimeout = 5000 } = options;
    const log = (lvl, ...args) => { if (logger && logger[lvl]) logger[lvl](...args); };

    let ws;
    let retryCount = 0;
    let isClosedIntentionally = false;

    const connect = () => {
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

/**
 * Direct DOM access (real DOM nodes, no virtual diffing)
 * - Example: $dom("#app").forEach(el => el.textContent = "Hello");
 */
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

/* ---------- $c: Chainable DOM helper built on top of $ and $_ ---------- */
const $c = (selector, index) => {
    let nodes = $(selector, true);
    if (!nodes || !nodes.length) nodes = [];
    if (!Array.isArray(nodes)) nodes = [nodes];
    if (typeof index === "number") {
        if (index < 0 || index >= nodes.length) {
            throw new Error(`Invalid index ${index} for ${nodes.length} nodes`);
        }
        nodes = [nodes[index]].filter(Boolean);
    }

    const invalidateCache = () => {
        if (_$.cache && _$.cache.has && _$.cache.has(selector)) _$.delete(selector);
    };

    const api = {
        addClass: cls => {
            nodes.forEach(el => {
                if (!el) return;
                addClassesToEl(el, cls);
            });
            return api;
        },
        removeClass: cls => {
            nodes.forEach(el => {
                if (!el) return;
                removeClassesFromEl(el, cls);
            });
            return api;
        },
        toggleClass: cls => {
            nodes.forEach(el => {
                if (!el) return;
                toggleClassesOnEl(el, cls);
            });
            return api;
        },
        attr: (key, val) => {
            nodes.forEach(el => {
                if (!el) return;
                if (val === undefined) {
                    removeAttrsFromEl(el, key);
                } else {
                    setAttrsOnEl(el, { [key]: val });
                }
            });
            return api;
        },
        css: (styles) => {
            nodes.forEach(el => {
                if (!el) return;
                setStylesOnEl(el, styles);
            });
            return api;
        },
        html: (content) => {
            nodes.forEach(el => {
                if (!el) return;
                n(() => el.innerHTML = content);
            });
            invalidateCache();
            return api;
        },
        text: (content) => {
            nodes.forEach(el => {
                if (!el) return;
                n(() => el.textContent = content);
            });
            invalidateCache();
            return api;
        },
        on: (evt, fn) => {
            nodes.forEach(el => {
                if (!el) return;
                el.addEventListener(evt, fn);
            });
            return api;
        },
        off: (evt, fn) => {
            nodes.forEach(el => {
                if (!el) return;
                el.removeEventListener(evt, fn);
            });
            return api;
        },
        append: (child) => {
            nodes.forEach(el => {
                if (!el) return;
                n(() => el.append(child.cloneNode(true)));
            });
            invalidateCache();
            return api;
        },
        prepend: (child) => {
            nodes.forEach(el => {
                if (!el) return;
                n(() => el.prepend(child.cloneNode(true)));
            });
            invalidateCache();
            return api;
        },
        each: (fn) => {
            nodes.forEach((el, i) => {
                if (!el) return;
                fn(el, i);
            });
            return api;
        },
        map: (fn) => $c(nodes.map((el, i) => fn(el, i)).filter(Boolean)),
        filter: (fn) => $c(nodes.filter((el, i) => fn(el, i))),
        get: () => nodes,
        first: () => nodes[0] || null,
        refresh: () => {
            nodes = $(selector, true);
            if (!nodes || !nodes.length) nodes = [];
            if (!Array.isArray(nodes)) nodes = [nodes];
            if (typeof index === "number") {
                if (index < 0 || index >= nodes.length) throw new Error(`Invalid index ${index}`);
                nodes = [nodes[index]].filter(Boolean);
            }
            return api;
        },
        dom: () => { return nodes }
    };
    return api;
};

/**
 * Hash-based router
 * @param {string|Function} route - Route path (e.g., '/path', '/user/:id') or default callback
 * @param {Function} [callback] - Callback({ path, params, query }) for route match
 */
const $h = (route, callback) => {
    const logger = yokto.defaultLogger || defaultLogger;
    const routes = $h.routes || ($h.routes = new Map());
    const log = (lvl, ...args) => logger[lvl](...args);

    // Register default route if route is a function
    if (typeof route === 'function') {
        $h.defaultRoute = route;
        return;
    }

    // Validate route and callback
    if (typeof route !== 'string' || typeof callback !== 'function') {
        throw new Error('Invalid route or callback');
    }

    // Convert route to regex (e.g., '/user/:id' -> /^\/user\/([^\/]+)$/)
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

    // Store route
    routes.set(route, { regex, callback, paramNames });
    log('info', `Registered route: ${route}`);

    // Handle hash change
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

    // Initialize if not already done
    if (!$h.initialized) {
        $win.addEventListener('hashchange', handleHash, { passive: true });
        $$(handleHash); // Run on DOM ready
        $h.initialized = true;
        log('info', 'Hash router initialized');
    }
};

/**
 * Hash-based location redirector, redirects to route (using client-only hash location)
 * @param string: route to redirect to
 */
const $a = route => {
    const ec = '/'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^[${ec}]+|[${ec}]+$`, 'g');
    route = route.replace(re, '');
    if ( ! route.startsWith('/') ) { route = '/' + route };
    $loc.hash = route
}

/* ------------------------------------------------------------------
 * Layout / App / Mount utilities (async-safe, per-layout preloaders)
 * ------------------------------------------------------------------ */

/**
 * $layout - layout registry & helpers
 * Provides:
 *   - $layout.define(name, slots, options)
 *   - $layout.get(name)
 *   - $layout.render(name, target)
 *   - $layout.showPreloader(name, slot)
 *   - $layout.hidePreloader(name, slot)
 *
 * slots: { slotName: selectorString }
 * options: { preloaders: { slotName: preloader }, defaultPreloader: preloader }
 */
const $layout = (() => {
    const registry = Object.create(null);

    // Ensure spinner CSS injected once
    let _spinnerInjected = false;
    const _ensureSpinnerStyle = () => {
        if (_spinnerInjected) return;
        _spinnerInjected = true;
        try {
            const css = `
/* yokto default spinner */
.yokto-spinner{display:inline-block;width:36px;height:36px;border:4px solid rgba(0,0,0,0.12);border-top-color:rgba(0,0,0,0.6);border-radius:50%;animation:yokto-spin .8s linear infinite}
@keyframes yokto-spin{to{transform:rotate(360deg)}}
.yokto-preloader{display:flex;align-items:center;justify-content:center;padding:8px}
`;
            const s = $doc.createElement('style');
            s.setAttribute('data-yokto-spinner', 'true');
            s.appendChild($doc.createTextNode(css));
            $doc.head.appendChild(s);
        } catch (e) {
            defaultLogger.debug("spinner style injection failed", e);
        }
    };

    const _createPreloaderNode = (pre) => {
        if (!pre && pre !== '') return null;
        if (typeof pre === 'function') return _createPreloaderNode(pre());
        if (pre instanceof HTMLElement) return pre.cloneNode(true);
        if (typeof pre === 'string') {
            const frag = $doc.createRange().createContextualFragment(pre);
            const wrapper = $doc.createElement('div');
            wrapper.className = 'yokto-preloader';
            wrapper.appendChild(frag);
            return wrapper;
        }
        return null;
    };

    const _resolveSingle = (selectorOrElement) => {
        if (!selectorOrElement) return null;
        if (selectorOrElement instanceof Element) return selectorOrElement;
        try {
            return $doc.querySelector(selectorOrElement);
        } catch (e) {
            // fallback: try $ helper
            try {
                const r = $(selectorOrElement);
                if (!r) return null;
                if (Array.isArray(r)) return r[0];
                return r;
            } catch (e2) {
                return null;
            }
        }
    };

    function define(name, slots = {}, options = {}) {
        if (!name || typeof name !== 'string') throw new Error("$layout.define: name required");
        if (registry[name]) {
            defaultLogger.warn(`$layout.define: layout '${name}' already defined, overwriting`);
        }
        registry[name] = {
            name,
            slots: { ...slots },
            options: { ...(options || {}) },
            nodes: {}
        };
        return registry[name];
    }

    function get(name) {
        return registry[name] || null;
    }

    async function render(name, target = '#app') {
        const layout = registry[name];
        if (!layout) throw new Error(`$layout.render: layout '${name}' not found`);
        _ensureSpinnerStyle();

        const host = _resolveSingle(target);
        if (!host) throw new Error(`$layout.render: target '${target}' not found in DOM`);

        for (const [slot, sel] of Object.entries(layout.slots)) {
            let node = null;
            try {
                node = host.querySelector(sel);
            } catch (e) {
                node = _resolveSingle(sel);
            }
            if (!node) {
                node = $doc.createElement('div');
                node.setAttribute('data-slot', slot);
                host.appendChild(node);
                defaultLogger.debug(`$layout.render: created placeholder for slot '${slot}' in host`);
            }
            layout.nodes[slot] = node;

            const preCfg = (layout.options && layout.options.preloaders && layout.options.preloaders[slot]) || layout.options?.defaultPreloader || null;
            if (preCfg) {
                const preNode = _createPreloaderNode(preCfg) || _createPreloaderNode('<div class="yokto-spinner" aria-hidden="true"></div>');
                if (preNode) {
                    node.innerHTML = '';
                    node.appendChild(preNode);
                }
            }
        }
        return layout;
    }

    function showPreloader(name, slot) {
        const layout = registry[name];
        if (!layout) throw new Error(`$layout.showPreloader: layout '${name}' not found`);
        const node = layout.nodes[slot];
        if (!node) throw new Error(`$layout.showPreloader: slot '${slot}' not found in layout '${name}'`);
        const preCfg = layout.options?.preloaders?.[slot] || layout.options?.defaultPreloader || '<div class="yokto-spinner" aria-hidden="true"></div>';
        const preNode = _createPreloaderNode(preCfg) || _createPreloaderNode('<div class="yokto-spinner" aria-hidden="true"></div>');
        node.innerHTML = '';
        if (preNode) node.appendChild(preNode);
    }

    function hidePreloader(name, slot) {
        const layout = registry[name];
        if (!layout) throw new Error(`$layout.hidePreloader: layout '${name}' not found`);
        const node = layout.nodes[slot];
        if (!node) return;
        node.innerHTML = '';
    }

    return {
        define,
        get,
        render,
        showPreloader,
        hidePreloader,
        _registry: registry
    };
})();

/**
 * App manager
 * - $app.init({ layout, target, state })
 * - $app.useLayout(name, target)
 * - $app.getLayout()
 * - $app.state (getter)
 */
const $app = (() => {
    let _state = {};
    let _currentLayoutName = null;
    let _currentLayout = null;

    return {
        async init(opts = {}) {
            const { layout, target = '#app', state = {} } = opts;
            _state = Object.assign({}, state);
            if (layout) {
                _currentLayoutName = layout;
                _currentLayout = await $layout.render(layout, target);
            }
            return this;
        },
        async useLayout(name, target = '#app') {
            _currentLayoutName = name;
            _currentLayout = await $layout.render(name, target);
            return _currentLayout;
        },
        getLayout() {
            return _currentLayout;
        },
        get state() {
            return _state;
        },
        setState(s = {}) {
            Object.assign(_state, s);
        },
        _currentLayoutName: () => _currentLayoutName
    };
})();

/**
 * $mount(layoutName, slotName, content, options)
 *
 * content: string | HTMLElement | DocumentFragment | Array<string|Node> | Promise<...>
 * options: { clear: boolean (default true), replace: boolean (default false) }
 *
 * Async-safe: if content is a Promise, it shows per-slot preloader while awaiting.
 * Returns inserted node or slot node.
 */
const $mount = async (layoutName, slotName, content, options = {}) => {
    const layout = $layout.get(layoutName);
    if (!layout) throw new Error(`$mount: layout '${layoutName}' not registered`);
    const slotNode = layout.nodes[slotName] || null;
    if (!slotNode) throw new Error(`$mount: slot '${slotName}' not found in layout '${layoutName}'`);

    const { clear = true, replace = false } = options;

    let resolved = content;
    if (resolved && typeof resolved.then === 'function') {
        try {
            $layout.showPreloader(layoutName, slotName);
        } catch (e) {
            defaultLogger.debug("$mount: showPreloader failed", e);
        }
        try {
            resolved = await resolved;
        } finally {
            try { $layout.hidePreloader(layoutName, slotName); } catch (e) { defaultLogger.debug("$mount: hidePreloader failed", e); }
        }
    }

    let nodeToInsert = null;
    if (resolved == null) {
        return slotNode;
    } else if (typeof resolved === 'string') {
        const frag = $doc.createRange().createContextualFragment(resolved);
        nodeToInsert = frag;
    } else if (resolved instanceof DocumentFragment) {
        nodeToInsert = resolved;
    } else if (resolved instanceof HTMLElement || resolved instanceof Node) {
        nodeToInsert = resolved;
    } else if (Array.isArray(resolved)) {
        const frag = $doc.createDocumentFragment();
        for (const item of resolved) {
            if (typeof item === 'string') {
                frag.appendChild($doc.createRange().createContextualFragment(item));
            } else if (item instanceof Node) {
                frag.appendChild(item);
            }
        }
        nodeToInsert = frag;
    } else {
        throw new Error("$mount: invalid content type (must be string|Node|Fragment|Promise|Array)");
    }

    if (clear) slotNode.innerHTML = '';

    if (replace) {
        if (nodeToInsert instanceof DocumentFragment) {
            const parent = slotNode.parentNode;
            parent.insertBefore(nodeToInsert, slotNode);
            parent.removeChild(slotNode);
        } else if (nodeToInsert instanceof Node) {
            slotNode.replaceWith(nodeToInsert);
            layout.nodes[slotName] = nodeToInsert;
        } else {
            slotNode.appendChild(nodeToInsert);
        }
        return layout.nodes[slotName];
    } else {
        if (nodeToInsert instanceof DocumentFragment) slotNode.appendChild(nodeToInsert);
        else slotNode.appendChild(nodeToInsert);
        return slotNode;
    }
};

/* ------------------------------------------------------------------
 * Exports: attach to yokto and window in a controlled, valid way
 * ------------------------------------------------------------------ */
yokto.$ = $;
yokto.$$ = $$;
yokto.__ = __;
yokto._$ = _$;
yokto._ = _;
yokto.$_ = $_;
yokto.$s = $s;
yokto.$c = $c;
yokto.$t = $t;
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

yokto.$layout = $layout;
yokto.$app = $app;
yokto.$mount = $mount;

yokto.clearCache = () => _$.clear();

if (typeof $win !== "undefined") {
    $win.yokto = yokto;
    // also expose common helpers to window for convenience
    $win.$ = $;
    $win._ = _;  // TODO: Actually expose all helpers to window
    $win.$_ = $_;
    $win.$$ = $$;
    $win.$s = $s;
    $win.$c = $c;
    $win.$t = $t;
    $win.$h = $h;
    $win.$a = $a;
    $win.$layout = $layout;
    $win.$app = $app;
    $win.$mount = $mount;
}
