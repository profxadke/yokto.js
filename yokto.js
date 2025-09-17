/**
 * yokto.js - A micro DOM utility/minimal DOM/HTTP helper library + DOM updater
 * --------------------------------------------
 * Provides ultra lightweight utilities for DOM selection, manipulation, element creation, traversal
 * DOM ready callbacks, and AJAX (fetch).
 *   - DOM selection: $
 *   - Helpers: __
 *   - Element creation: _
 *   - DOM ready: $$
 *   - DOM updater: $_
 *   - HTTP Clients: RESTClient, GraphQLClient
 *   - WebSocket Client: WSClient
 *   - Inline style helper: $s
 *   - Chained DOM selector, and updater: $c
 *
 * API:
 *   $(selector, return_list, useCache) -> Selects elements
 *     - returns single element if only one match or return_list == false
 *     - returns array of elements if multiple matches and return_list == true
 *     - useCache: if true, caches/reuses selection
 *
 *   __(obj) -> Checks if obj is an array-like object (helper)
 *
 *   _(parentSelector, tag, attrs, innerText) -> Creates and appends element
 *
 *   $$(fn) -> Executes fn when DOM is ready
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
 *   $c(query) -> Chained version of $ and $_ combined
 *
 *   $s(query, styles, index) -> Inline CSS/Style setter
 *
 *   RESTClient() -> HTTP REST Client
 *
 *   GraphQLClient() -> GraphQL Client
 *
 *   WSClient() -> WebSocket Client
 *
 *   clearCache() -> Clears cached DOM selections
 *
 */

// Cache for $ selections (selector -> WeakRef(nodes array))
const _$ = new Map();

/**
 * Select elements from DOM.
 * @param {string} query - CSS selector string
 * @param {boolean} [return_list=false] - if true, return all matching elements as array
 * @param {boolean} [useCache=false] - if true, use/cache the selection for reuse
 * @returns {Element|Element[]|null} - a single Element, array of Elements, or null if no matches
 */
const $ = (query, return_list = false, useCache = false) => {
    if (useCache && _$.has(query)) {
        const cachedRef = _$.get(query);
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
    const elems = document.querySelectorAll(query);
    if (elems.length === 0 && !return_list) {
        return null; // Prevent undefined errors
    }
    const nodes = Array.prototype.slice.call(elems);
    if (useCache) {
        _$.set(query, new WeakRef(nodes));
    }
    if (elems.length === 1 && !return_list) {
        return nodes[0];
    }
    return nodes;
};

/**
 * Check if object is array-like (close to an Array) and isn't empty.
 * @param {any} obj
 * @returns {boolean} true if object is array-like and isn't empty.
 */
const __ = (obj) => {
    return typeof obj === "object" && obj && obj.length > 0;
};

/**
 * Check if object is an associative Array (dict from py)
 * @param {any} obj
 * @returns {boolean} true if object is an associative array, object with key-value pair
 */
const ___ = obj => {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
};

/**
 * Create and append a new element inside parent element.
 * @param {string} parentSelector - CSS selector of parent
 * @param {string} tag - tag name of element to create
 * @param {object} [attrs] - attributes as key:value
 * @param {string} [innerText] - optional inner text content
 */
const _ = (parentSelector, tag, attrs, innerText) => {
    const parentElem = $(parentSelector);
    if (!parentElem) {
        throw new Error(`Parent Node/Element Doesn't Exist for selector: ${parentSelector}`);
    }
    let elem = document.createElement(tag);
    if (___(attrs)) {
        for (let key in attrs) {
            if (Object.prototype.hasOwnProperty.call(attrs, key)) {
                elem.setAttribute(key, attrs[key]);
            }
        }
    }
    if (innerText && typeof innerText === 'string') {
        elem.innerText = innerText;
    }
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

    if (document.readyState != "loading") {
        fn();
    } else if (document.addEventListener) {
        document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
        document.attachEvent("onreadystatechange", function () {
            if (document.readyState != "loading") fn();
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
        nodes = [nodes[options.index]].filter(Boolean);
    }

    nodes.forEach(el => {
        if (!el) return; // Prevent errors on undefined elements
        // Add classes
        if (options.addClasses) {
            if (typeof options.addClasses !== 'string' && !Array.isArray(options.addClasses)) return;
            const clsArr = Array.isArray(options.addClasses)
                ? options.addClasses
                : String(options.addClasses).split(/\s+/).filter(Boolean);
            el.classList.add(...clsArr);
        }

        // Remove classes
        if (options.removeClasses) {
            if (typeof options.removeClasses !== 'string' && !Array.isArray(options.removeClasses)) return;
            const clsArr = Array.isArray(options.removeClasses)
                ? options.removeClasses
                : String(options.removeClasses).split(/\s+/).filter(Boolean);
            el.classList.remove(...clsArr);
        }

        // Toggle classes
        if (options.toggleClasses) {
            if (typeof options.toggleClasses !== 'string' && !Array.isArray(options.toggleClasses)) return;
            const clsArr = Array.isArray(options.toggleClasses)
                ? options.toggleClasses
                : String(options.toggleClasses).split(/\s+/).filter(Boolean);
            clsArr.forEach(cls => el.classList.toggle(cls));
        }

        // Set attributes
        if (options.setAttrs && ___(options.setAttrs)) {
            for (const [k, v] of Object.entries(options.setAttrs)) {
                el.setAttribute(k, v);
            }
        }

        // Remove attributes
        if (options.removeAttrs) {
            if (typeof options.removeAttrs !== 'string' && !Array.isArray(options.removeAttrs)) return;
            const attrArr = Array.isArray(options.removeAttrs)
                ? options.removeAttrs
                : [options.removeAttrs];
            attrArr.forEach(attr => el.removeAttribute(attr));
        }
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
        nodes = [nodes[index]].filter(Boolean);
    }

    nodes.forEach(el => {
        if (!el) return; // Prevent errors on undefined elements
        if (typeof styles === "string") {
            // parse "prop: value"
            let [prop, val] = styles.split(":").map(s => s.trim());
            if (prop && val) el.style[prop] = val;
        } else if (___(styles)) {
            // apply multiple styles, if associative array
            for (const [prop, val] of Object.entries(styles)) {
                el.style[prop] = val;
            }
        }
    });
};

/* ---------- Logger ---------- */
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
 * ------------------------
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} url - endpoint URL
 * @param {object} [options] - optional config
 * @param {object} [options.data] - JSON body for POST/PUT
 * @param {object} [options.params] - query parameters for GET
 * @param {object} [options.headers] - additional headers
 * @param {boolean} [options.raw=false] - return raw Response instead of JSON
 * @param {integer} [options.retry=0] - times to retry the request on failure
 * @param {number} [options.timeout=0] - timeout for the REST HTTP Client
 * @param {boolean} [options.verbose=false] - verbosity of the REST HTTP Client
 * @returns {Promise<object|Response>} - JSON response, raw Response or raised Err
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
    if (params && ___(params)) {
        const queryString = new URLSearchParams(params).toString();
        fullUrl += (url.includes("?") ? "&" : "?") + queryString;
    }

    const fetchWithTimeout = (signal) => {
        const fetchOptions = {
            method,
            headers: { ...headers },
            body: data ? (() => {
                try {
                    return JSON.stringify(data);
                } catch (err) {
                    log("error", "RESTClient: Failed to serialize body", err);
                    throw new Error("Invalid JSON data");
                }
            })() : undefined,
            signal
        };
        if (data && !fetchOptions.headers["Content-Type"]) {
            fetchOptions.headers["Content-Type"] = "application/json";
        }
        if (verbose) log("info", "REST request", { method, fullUrl, headers: fetchOptions.headers });
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
            if (err.name === 'AbortError') throw new Error('Timeout');
            log("warn", `REST attempt ${attempt} failed:`, err.message || err);
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
 * --------------
 * @param {string} url - GraphQL endpoint
 * @param {object} options
 * @param {string} options.query - GraphQL query or mutation
 * @param {object} [options.variables] - variables for query
 * @param {object} [options.headers] - custom headers
 * @param {object} [options] - custom options for RESTClient
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
 * WebSocket wrapper
 * -----------------
 * @param {string} url - WebSocket server URL
 * @param {object} [options]
 * @param {function} [options.onOpen] - called on connection open
 * @param {function} [options.onClose] - called on connection close
 * @param {function} [options.onMessage] - called on incoming message
 * @param {function} [options.onError] - called on error
 * @param {boolean} [options.verbose] - enable verbose logging, default=false
 * @param {boolean} [options.autoReconnect=true] - auto reconnect on close/error
 * @param {number} [options.reconnectRetries=5] - max reconnect attempts
 * @param {number} [options.reconnectDelay=1000] - base delay ms (exponential)
 * @param {number} [options.connectTimeout=5000] - timeout for initial connect
 * @returns {WebSocket} - WebSocket instance with sendMessage and reconnect methods
 */
const WSClient = (url, options = {}) => {
    const { onOpen, onClose, onMessage, onError, protocols, verbose = false, logger = defaultLogger,
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
            ws.close();
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
            if (verbose) log("debug", "WS message", e.data);
            onMessage?.(e);
        };
        ws.onerror = e => {
            log("error", "WS error", e);
            onError?.(e);
            if (autoReconnect && retryCount < reconnectRetries) {
                ws.close();
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
        ws.close();
        init();
    };

    ws.closeIntentionally = () => {
        isClosedIntentionally = true;
        ws.close();
    };

    return ws;
};

/* ---------- $c: Chainable DOM helper built on top of $ and $_ ---------- */
const $c = (selector, index) => {
    let nodes = $(selector, true);
    if (!nodes || !nodes.length) nodes = [];
    if (!Array.isArray(nodes)) nodes = [nodes];
    if (typeof index === "number") nodes = [nodes[index]].filter(Boolean);

    const api = {
        // Operate directly on cached nodes
        addClass: cls => {
            nodes.forEach(el => {
                if (!el) return;
                const clsArr = Array.isArray(cls) ? cls : String(cls).split(/\s+/).filter(Boolean);
                el.classList.add(...clsArr);
            });
            return api;
        },
        removeClass: cls => {
            nodes.forEach(el => {
                if (!el) return;
                const clsArr = Array.isArray(cls) ? cls : String(cls).split(/\s+/).filter(Boolean);
                el.classList.remove(...clsArr);
            });
            return api;
        },
        toggleClass: cls => {
            nodes.forEach(el => {
                if (!el) return;
                const clsArr = Array.isArray(cls) ? cls : String(cls).split(/\s+/).filter(Boolean);
                clsArr.forEach(c => el.classList.toggle(c));
            });
            return api;
        },
        attr: (key, val) => {
            nodes.forEach(el => {
                if (!el) return;
                if (val === undefined) {
                    el.removeAttribute(key);
                } else {
                    el.setAttribute(key, val);
                }
            });
            return api;
        },
        css: (styles) => {
            nodes.forEach(el => {
                if (!el) return;
                if (typeof styles === "string") {
                    let [prop, val] = styles.split(":").map(s => s.trim());
                    if (prop && val) el.style[prop] = val;
                } else if (___(styles)) {
                    for (const [prop, val] of Object.entries(styles)) {
                        el.style[prop] = val;
                    }
                }
            });
            return api;
        },

        // Direct element content
        html: (content) => {
            nodes.forEach(el => {
                if (!el) return;
                el.innerHTML = content;
            });
            return api;
        },
        text: (content) => {
            nodes.forEach(el => {
                if (!el) return;
                el.textContent = content;
            });
            return api;
        },

        // Event handling
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

        // DOM insertion
        append: (child) => {
            nodes.forEach(el => {
                if (!el) return;
                el.append(child.cloneNode(true));
            });
            return api;
        },
        prepend: (child) => {
            nodes.forEach(el => {
                if (!el) return;
                el.prepend(child.cloneNode(true));
            });
            return api;
        },

        // Iteration helpers
        each: (fn) => {
            nodes.forEach((el, i) => {
                if (!el) return;
                fn(el, i);
            });
            return api;
        },
        map: (fn) => $c(nodes.map((el, i) => fn(el, i)).filter(Boolean)),
        filter: (fn) => $c(nodes.filter((el, i) => fn(el, i))),

        // Accessors
        get: () => nodes,
        first: () => nodes[0] || null,
    };
    return api;
};

/* Alias */
$r = RESTClient;
$g = GraphQLClient;
$w = WSClient;
$l = Logger;

/* ---------- Export ---------- */
const yokto = {
    $, $$, _, $_, $s, $c, $r, $w, $g, $l,
    RESTClient, WSClient, GraphQLClient,
    Logger, defaultLogger,
    clearCache: () => _$.clear() // Method to clear cache
};

if (typeof window !== "undefined") window.yokto = yokto;
