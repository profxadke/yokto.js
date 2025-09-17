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
 *   $(selector, return_list) -> Selects elements
 *     - returns single element if only one match or return_list == false
 *     - returns array of elements if multiple matches and return_list == true
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
 *   $c(query) -> Chained version of $ and $_ combined.
 *
 *   $s(query, Styles{}, index) -> Inline CSS/Style setter
 *
 *   RESTClient() -> HTTP REST Client
 *
 *   GraphQLClient() -> GraphQ Client
 *
 *   WSClient() -> WebSocket Client
 *
 */


/**
 * Select elements from DOM.
 * @param {string} query - CSS selector string
 * @param {boolean} [return_list=false] - if true, return all matching elements as array
 * @returns {Element|Element[]} - a single Element or array of Elements
 */
const $ = (query, return_list) => {
    const elems = document.querySelectorAll(query);
    if (elems.length === 1 || !return_list) {
        return elems[0];
    }
    return Array.prototype.slice.call(elems);
};


/**
 * Check if object is array-like.
 * @param {any} obj
 * @returns {boolean} true if object is array-like
 */
const __ = (obj) => {
    if (typeof obj === "object" && obj.length) {
        return true;
    }
};


/**
 * Create and append a new element inside parent element.
 * @param {string} parentSelector - CSS selector of parent
 * @param {string} tag - tag name of element to create
 * @param {object} [attrs] - attributes as key:value
 * @param {string} [innerText] - optional inner text content
 */
const _ = (parentSelector, tag, attrs, innerText) => {
    var parentElem = $(parentSelector);
    let elem = document.createElement(tag);
    if (!(__(typeof attrs))) {
        for (key in attrs) {
            elem.setAttribute(key, attrs[key]);
        }
    }
    if (innerText) {
        elem.innerText = innerText.toString();
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
    if (!nodes) return;

    if (!Array.isArray(nodes)) nodes = [nodes];
    if (typeof options.index === "number") {
        nodes = [nodes[options.index]].filter(Boolean);
    }

    nodes.forEach(el => {
        // Add classes
        if (options.addClasses) {
            const clsArr = Array.isArray(options.addClasses)
                ? options.addClasses
                : String(options.addClasses).split(/\s+/).filter(Boolean);
            el.classList.add(...clsArr);
        }

        // Remove classes
        if (options.removeClasses) {
            const clsArr = Array.isArray(options.removeClasses)
                ? options.removeClasses
                : String(options.removeClasses).split(/\s+/).filter(Boolean);
            el.classList.remove(...clsArr);
        }

        // Toggle classes
        if (options.toggleClasses) {
            const clsArr = Array.isArray(options.toggleClasses)
                ? options.toggleClasses
                : String(options.toggleClasses).split(/\s+/).filter(Boolean);
            clsArr.forEach(cls => el.classList.toggle(cls));
        }

        // Set attributes
        if (options.setAttrs) {
            for (const [k, v] of Object.entries(options.setAttrs)) {
                el.setAttribute(k, v);
            }
        }

        // Remove attributes
        if (options.removeAttrs) {
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
    if (!nodes) return;

    if (!Array.isArray(nodes)) nodes = [nodes];
    if (typeof index === "number") {
        nodes = [nodes[index]].filter(Boolean);
    }

    nodes.forEach(el => {
        if (typeof styles === "string") {
            // parse "prop: value"
            let [prop, val] = styles.split(":").map(s => s.trim());
            if (prop && val) el.style[prop] = val;
        } else {
            // apply multiple styles
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
 * @param {boolean} [options.verbose=false] - verbosoty of the REST HTTP Client
 * @returns {Promise<object|Response>} - JSON response, raw Response or raised Err (based on option and execution afterwards)
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
    if (params && typeof params === "object") {
        const queryString = new URLSearchParams(params).toString();
        fullUrl += (url.includes("?") ? "&" : "?") + queryString;
    }

    const fetchWithTimeout = (signal) => {
        const fetchOptions = {
            method,
            headers: { ...headers },
            body: data ? JSON.stringify(data) : undefined,
            signal
        };
        if (data && !fetchOptions.headers["Content-Type"]) {
            fetchOptions.headers["Content-Type"] = "application/json";
        }
        if (verbose) log("info", "REST request", { method, fullUrl, headers: fetchOptions.headers, body: data });
        return fetch(fullUrl, fetchOptions);
    };

    // normalize retry config
    let maxAttempts = typeof retry === "number" ? retry : (retry?.attempts || 1);
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
 * @param {boolean}  [options.verbose] - enable verbose logging, default=false
 * @returns {WebSocket} - WebSocket instance with sendMessage method
 */
const WSClient = (url, options = {}) => {
    const { onOpen, onClose, onMessage, onError, protocols, verbose = false, logger = defaultLogger } = options;
    const log = (lvl, ...args) => { if (logger && logger[lvl]) logger[lvl](...args); };

    const ws = new WebSocket(url, protocols);

    ws.onopen = e => { if (verbose) log("info", "WS open", url); onOpen?.(e); };
    ws.onclose = e => { if (verbose) log("warn", "WS closed", e); onClose?.(e); };
    ws.onmessage = e => { if (verbose) log("debug", "WS message", e.data); onMessage?.(e); };
    ws.onerror = e => { log("error", "WS error", e); onError?.(e); };

    ws.sendMessage = (data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(typeof data === "string" ? data : JSON.stringify(data));
        } else {
            log("warn", "WS sendMessage: socket not open");
        }
    };
    return ws;
};


/* ---------- $c: Chainable DOM helper built on top of $ and $_ ---------- */
const $c = (selector, index) => {
    let nodes = $(selector, true);
    if (!nodes) nodes = [];
    if (!Array.isArray(nodes)) nodes = [nodes];
    if (typeof index === "number") nodes = [nodes[index]].filter(Boolean);

    const api = {
        // Delegate directly to $_ for class/attr operations
        addClass: cls => { $_(selector, { addClasses: cls, index }); return api; },
        removeClass: cls => { $_(selector, { removeClasses: cls, index }); return api; },
        toggleClass: cls => { $_(selector, { toggleClasses: cls, index }); return api; },
        attr: (key, val) => {
            if (val === undefined) {
                $_(selector, { removeAttrs: key, index });
            } else {
                $_(selector, { setAttrs: { [key]: val }, index });
            }
            return api;
        },
        css: (styles) => { $s(selector, styles, index); return api; },

        // Direct element content
        html: (content) => { nodes.forEach(el => el.innerHTML = content); return api; },
        text: (content) => { nodes.forEach(el => el.textContent = content); return api; },

        // Event handling
        on: (evt, fn) => { nodes.forEach(el => el.addEventListener(evt, fn)); return api; },
        off: (evt, fn) => { nodes.forEach(el => el.removeEventListener(evt, fn)); return api; },

        // DOM insertion
        append: (child) => { nodes.forEach(el => el.append(child.cloneNode(true))); return api; },
        prepend: (child) => { nodes.forEach(el => el.prepend(child.cloneNode(true))); return api; },

        // Iteration helpers
        each: (fn) => { nodes.forEach((el, i) => fn(el, i)); return api; },
        map: (fn) => $c(nodes.map((el, i) => fn(el, i)).filter(Boolean)),
        filter: (fn) => $c(nodes.filter((el, i) => fn(el, i))),

        // Accessors
        get: () => nodes,
        first: () => nodes[0] || null,
    };
    return api;
};


/* ---------- Export ---------- */
const yokto = {
    $, $$, $_, _, $s, $c,
    RESTClient, GraphQLClient, WSClient,
    Logger, defaultLogger
};


if (typeof window !== "undefined") window.yokto = yokto;
