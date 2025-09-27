// The new yokto.js is a vNode-based DOM utility.
// This example demonstrates creating and mounting vNodes with $v and _ (while also containing the power the manipulate DOM-in-ease!)
(() => {
  // Mounting the layout first.
  _( $v('div', {id: 'app'}, [
    $v('div', {id: 'header'}),
    $v('div', {id: 'body'}),
    $v('div', {id: 'footer'})
  ]), document.body);
  // Mount header by creating vNodes.
  const headerSlot = $('#header');
  _( $v('div', { style: 'display:flex;align-items:center;justify-content:space-between' }, [
      $v('div', {}, [ $v('strong', {}, 'Yokto Demo') ]),
      $v('nav', { class: 'nav' }, [
        $v('a', { href: '#/home' }, 'Home'),
        $v('a', { href: '#/about' }, 'About')
      ])
    ]), headerSlot);
  // Put a persistent footer (static) once by creating and mounting a vNode.
  const footerSlot = $('#footer');
  _( $v('div', {}, '© 2025 — Yokto Demo'), footerSlot );

  // Define a vNode for the main preloader to be reused.
  const mainPreloader = $v('div', { class: 'yokto-preloader' }, [
    $v('div', { class: 'yokto-spinner', 'aria-hidden': 'true' }),
    $v('span', { style: 'margin-left:8px' }, 'Loading content…')
  ]);

  // Create two UI routes via $h.
  $h('/home', ({ path, params, query }) => {
    // Mount main content asynchronously using vNodes.
    const mainSlot = $('#body');
    mainSlot.text = ''; // Clear slot
    _(mainPreloader, mainSlot); // Mount preloader

    const promise = new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          $v('h1', {}, 'Home'),
          $v('p', {}, `Welcome to the Yokto demo. Content loaded at ${new Date().toLocaleTimeString()}.`),
          $v('p', {}, [
            'This update replaced only the ',
            $v('code', {}, '#body'),
            ' slot — the rest of the DOM was unchanged.'
          ])
        ]);
      }, 800);
    });

    promise.then(contentVNodes => {
      mainSlot.text = ''; // Clear preloader
      contentVNodes.forEach(vnode => _(vnode, mainSlot));
    });
  });

  $h('/about', ({ path }) => {
    // Mount main content asynchronously
    const mainSlot = $('#body');
    mainSlot.text = ''; // Clear slot
    _(mainPreloader, mainSlot); // Mount preloader

    const promise = new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          $v('h1', {}, 'About'),
          $v('p', {}, 'Yokto is tiny, synchronous-first, and supports async mounting of slot content.')
        ]);
      }, 450);
    });

    promise.then(contentVNodes => {
      mainSlot.text = ''; // Clear preloader
      contentVNodes.forEach(vnode => _(vnode, mainSlot));
    });
  });

  // default route: go to #/home if none present
  $h('/', () => {
    $a('/home');
  });

  // If there's already a hash, the router will trigger on DOM-ready.
  // If not, trigger default route.
  if (!location.hash) $a('/home');
})();
