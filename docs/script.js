document.addEventListener('DOMContentLoaded', function () {
  initTheme();

  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const sidebar = document.querySelector('.sidebar');
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  const currentPath = window.location.pathname;
  const currentHash = window.location.hash;

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', function () {
      if (window.innerWidth <= 768) {
        navMenu.classList.toggle('open');
        if (sidebar) {
          sidebar.classList.remove('open');
        }
        document.body.classList.remove('sidebar-open');
      } else if (window.innerWidth <= 1024) {
        if (sidebar) {
          sidebar.classList.toggle('open');
          if (sidebar.classList.contains('open')) {
            document.body.classList.add('sidebar-open');
          } else {
            document.body.classList.remove('sidebar-open');
          }
        }
        if (navMenu) {
          navMenu.classList.remove('open');
        }
      }
    });
  }

  document.addEventListener('click', function (e) {
    if (window.innerWidth <= 768) {
      if (navMenu && mobileMenuToggle && !navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
        navMenu.classList.remove('open');
      }
    } else if (window.innerWidth <= 1024) {
      if (sidebar && mobileMenuToggle && !sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
      }
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 1024) {
      if (sidebar) sidebar.classList.remove('open');
      if (navMenu) navMenu.classList.remove('open');
      document.body.classList.remove('sidebar-open');
    } else if (window.innerWidth <= 768) {
      if (sidebar) sidebar.classList.remove('open');
      document.body.classList.remove('sidebar-open');
    }
  });

  sidebarLinks.forEach((link) => {
    const linkPath = new URL(link.href).pathname;
    const linkHash = new URL(link.href).hash;

    if (linkPath === currentPath || (linkHash && linkHash === currentHash)) {
      link.classList.add('active');

      let parent = link.parentElement;
      while (parent && parent !== document.body) {
        if (parent.tagName === 'LI' && parent.parentElement.tagName === 'UL') {
          const parentUl = parent.parentElement;
          if (parentUl.previousElementSibling && parentUl.previousElementSibling.tagName === 'A') {
            parentUl.previousElementSibling.classList.add('active');
          }
        }
        parent = parent.parentElement;
      }
    }
  });

  const navMenuLinks = document.querySelectorAll('.nav-menu a');
  const currentPage = currentPath.split('/').pop() || 'index.html';

  navMenuLinks.forEach((link) => {
    if (link.classList.contains('external-link')) {
      return;
    }

    const linkPath = new URL(link.href, window.location.href).pathname;
    const linkPage = linkPath.split('/').pop() || 'index.html';

    if (linkPage === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#' && href.length > 1) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const offsetTop = target.offsetTop - 80;
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth',
          });

          window.history.pushState(null, null, href);
        }
      }
    });
  });

  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.sidebar-nav a[href^="#"]');

  function highlightNav() {
    let current = '';
    const scrollY = window.pageYOffset + 100;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === `#${current}`) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', highlightNav);
  highlightNav();

  function addAnchorLinks() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === 'index.html') {
      return;
    }

    const headings = document.querySelectorAll('section h2, section h3, section h4, h2, h3, h4');
    headings.forEach((heading) => {
      if (!heading.id) {
        const text = heading.textContent.trim();
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
        heading.id = id;
      }

      if (!heading.querySelector('a[href^="#"]')) {
        const anchor = document.createElement('a');
        anchor.href = `#${heading.id}`;
        anchor.textContent = '#';
        anchor.className = 'anchor-link';
        anchor.title = 'Copy link to this section';
        heading.appendChild(anchor);

        anchor.addEventListener('click', function (e) {
          e.preventDefault();
          const url = window.location.href.split('#')[0] + '#' + heading.id;
          navigator.clipboard.writeText(url).then(() => {
            const originalText = anchor.textContent;
            anchor.textContent = '✓';
            setTimeout(() => {
              anchor.textContent = originalText;
            }, 2000);
          });
          window.location.hash = heading.id;
        });
      }
    });
  }

  addAnchorLinks();
  addCopyButtons();
  initSearch();
});

function initTheme() {
  const themeToggle = document.querySelector('.theme-toggle');
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  let currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    currentTheme = theme;
  }

  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    setTheme(prefersDark ? 'dark' : 'light');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    });
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', function (e) {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
  } else {
    mediaQuery.addListener(function (e) {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}

function addCopyButtons() {
  const codeBlocks = document.querySelectorAll('pre code');

  codeBlocks.forEach((codeBlock) => {
    const pre = codeBlock.parentElement;
    if (pre.tagName === 'PRE' && !pre.querySelector('.copy-button')) {
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-button';
      copyButton.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span>';
      copyButton.title = 'Copy code to clipboard';

      copyButton.addEventListener('click', async function (e) {
        e.stopPropagation();
        const text = codeBlock.textContent;
        try {
          await navigator.clipboard.writeText(text);
          copyButton.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Copied!</span>';
          copyButton.classList.add('copied');

          setTimeout(() => {
            copyButton.innerHTML =
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span>';
            copyButton.classList.remove('copied');
          }, 2000);
        } catch (err) {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            copyButton.innerHTML =
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Copied!</span>';
            copyButton.classList.add('copied');
            setTimeout(() => {
              copyButton.innerHTML =
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span>';
              copyButton.classList.remove('copied');
            }, 2000);
          } catch (e) {
            copyButton.innerHTML =
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg><span>Failed</span>';
            setTimeout(() => {
              copyButton.innerHTML =
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span>';
            }, 2000);
          }
          document.body.removeChild(textArea);
        }
      });

      pre.style.position = 'relative';
      pre.appendChild(copyButton);
    }
  });
}

const searchIndex = [
  {
    page: 'getting-started.html',
    title: 'Getting Started',
    sections: [
      { title: 'Installation', content: 'Install Turbyoot using npm. Node.js 20 or higher is required.' },
      {
        title: 'Quick Start',
        content: 'The quickest way to get started with Turbyoot. Create a new Turbyoot instance and define routes.',
      },
      { title: 'Basic Example', content: 'Simple example showing how to create a server and handle GET requests.' },
    ],
  },
  {
    page: 'guide.html',
    title: 'Guide',
    sections: [
      { title: 'Routing', content: 'Learn about basic routing, fluent API, resource routing, and grouped routes.' },
      {
        title: 'Basic Routing',
        content: 'Define routes using HTTP methods like get, post, put, delete, patch, options, and head.',
      },
      {
        title: 'Fluent API',
        content: 'Chainable route definition using the fluent API for cleaner code organization.',
      },
      { title: 'Resource Routing', content: 'Automatic CRUD routes with custom handlers and filtering options.' },
      {
        title: 'Grouped Routes',
        content: 'Organize routes with prefixes and shared middleware using the group method.',
      },
      { title: 'Middleware', content: 'Using and writing middleware functions to handle requests and responses.' },
      {
        title: 'Context',
        content: 'Understanding the context object with request, response, params, query, and body properties.',
      },
      {
        title: 'Plugins',
        content:
          'Extend functionality with plugins. Create plugin factories for configurable plugins and async plugins.',
      },
    ],
  },
  {
    page: 'api.html',
    title: 'API Reference',
    sections: [
      {
        title: 'Turbyoot',
        content: 'Main application class with methods for routing, middleware, and server management.',
      },
      { title: 'app.use()', content: 'Add middleware to the application stack.', id: 'app-use' },
      { title: 'app.get()', content: 'Define a GET route handler.', id: 'app-get' },
      { title: 'app.post()', content: 'Define a POST route handler.', id: 'app-post' },
      { title: 'app.put()', content: 'Define a PUT route handler.', id: 'app-put' },
      { title: 'app.del()', content: 'Define a DELETE route handler.', id: 'app-del' },
      { title: 'app.patch()', content: 'Define a PATCH route handler.', id: 'app-patch' },
      { title: 'app.static()', content: 'Serve static files from a directory.', id: 'app-static' },
      {
        title: 'app.group()',
        content: 'Create a group of routes with a common prefix and middleware.',
        id: 'app-group',
      },
      {
        title: 'app.resource()',
        content: 'Generate RESTful routes for a resource with automatic CRUD operations.',
        id: 'app-resource',
      },
      { title: 'app.plugin()', content: 'Register and install plugins to extend functionality.', id: 'app-plugin' },
      { title: 'app.configure()', content: 'Configure application settings including body parsing limits, custom body parsers for XML YAML CSV content types, and template engine views directory, engine, and caching options.', id: 'app-configure' },
      { title: 'app.listen()', content: 'Start the server and listen on a port. Returns the server instance further integrations with other libraries.', id: 'app-listen' },
      { title: 'app.getServer()', content: 'Get the underlying Node.js server instance after listen has been called.', id: 'app-getserver' },
      { title: 'app.enableGracefulShutdown()', content: 'Enable graceful shutdown with signal handling SIGTERM SIGINT for clean server shutdown.', id: 'app-enablegracefulshutdown' },
      {
        title: 'Context',
        content: 'Request context object with properties and helper methods for handling HTTP requests and responses.',
      },
      { title: 'ctx.json()', content: 'Send JSON response with automatic content-type header.', id: 'ctx-json' },
      { title: 'ctx.render()', content: 'render template file using configured template engine supports EJS Pug Handlebars Express-compatible engines render HTML templates with data configure views directory register engines automatic engine resolution auto-detect renderFile render manual registration', id: 'ctx-render' },
      { title: 'ctx.send()', content: 'Sends the HTTP response. The body parameter can be a String, Buffer, or an Object.', id: 'ctx-send' },
      { title: 'ctx.status()', content: 'Set HTTP status code for the response.', id: 'ctx-status' },
      { title: 'ctx.redirect()', content: 'Redirects to the URL derived from the specified path, with specified status.', id: 'ctx-redirect' },
      { title: 'ctx.type()', content: 'Sets the Content-Type HTTP header.', id: 'ctx-type' },
      { title: 'ctx.ok()', content: 'Send 200 OK response with JSON data.', id: 'ctx-ok' },
      { title: 'ctx.created()', content: 'Send 201 Created response.', id: 'ctx-created' },
      { title: 'ctx.noContent()', content: 'Send 204 No Content response.', id: 'ctx-nocontent' },
      { title: 'ctx.badRequest()', content: 'Send 400 Bad Request response.', id: 'ctx-badrequest' },
      { title: 'ctx.unauthorized()', content: 'Send 401 Unauthorized response.', id: 'ctx-unauthorized' },
      { title: 'ctx.forbidden()', content: 'Send 403 Forbidden response.', id: 'ctx-forbidden' },
      { title: 'ctx.notFound()', content: 'Send 404 Not Found response.', id: 'ctx-notfound' },
      { title: 'ctx.conflict()', content: 'Send 409 Conflict response.', id: 'ctx-conflict' },
      { title: 'ctx.unprocessableEntity()', content: 'Send 422 Unprocessable Entity response.', id: 'ctx-unprocessableentity' },
      { title: 'ctx.tooManyRequests()', content: 'Send 429 Too Many Requests response.', id: 'ctx-toomanyrequests' },
      { title: 'ctx.internalError()', content: 'Send 500 Internal Server Error response.', id: 'ctx-internalerror' },
      { title: 'ctx.notImplemented()', content: 'Send 501 Not Implemented response.', id: 'ctx-notimplemented' },
      { title: 'ctx.header()', content: 'Sets the response HTTP header field to value.', id: 'ctx-header' },
      { title: 'ctx.cookie()', content: 'Sets cookie name to value. The value parameter may be a string or object converted to JSON.', id: 'ctx-cookie' },
      { title: 'ctx.clearCookie()', content: 'Clears the cookie specified by name.', id: 'ctx-clearcookie' },
      { title: 'ctx.is()', content: 'Returns true if the incoming requests Content-Type HTTP header field matches the MIME type specified by the type parameter.', id: 'ctx-is' },
      { title: 'ctx.accepts()', content: 'Checks if the specified content types are acceptable, based on the requests Accept HTTP header field.', id: 'ctx-accepts' },
      { title: 'ctx.get()', content: 'Returns the specified HTTP request header field case-insensitive match.', id: 'ctx-get' },
      {
        title: 'Middleware',
        content: 'Built-in middleware functions for security, validation, compression, caching, and more.',
      },
      { title: 'helmet()', content: 'Security middleware to set various HTTP headers for protection.' },
      { title: 'cors()', content: 'Cross-Origin Resource Sharing middleware with preflight caching, dynamic origin validation, and credentials handling.' },
      { title: 'rateLimit()', content: 'Rate limiting middleware to prevent abuse.' },
      { title: 'validate()', content: 'Request validation middleware with schema support.' },
      { title: 'compression()', content: 'Response compression middleware using gzip or deflate.' },
      { title: 'cache()', content: 'HTTP caching middleware with ETag and Last-Modified support.' },
      { title: 'auth()', content: 'Authentication middleware for user authentication and authorization.' },
      {
        title: 'Template Engine',
        content: 'template engine render HTML templates using template engines EJS Pug Handlebars configure views directory register engines use ctx.render render templates with data template rendering view engine EJS Pug Handlebars support automatic detection auto-load renderFile render manual registration engines config',
        id: 'ctx-render',
      },
    ],
  },
];

function initSearch() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const searchContainer = document.querySelector('.search-container');

  if (!searchInput || !searchResults || !searchContainer) return;

  let searchTimeout;

  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    const query = this.value.trim().toLowerCase();

    if (query.length < 2) {
      searchResults.classList.remove('active');
      return;
    }

    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 200);
  });

  searchInput.addEventListener('focus', function () {
    if (this.value.trim().length >= 2) {
      performSearch(this.value.trim().toLowerCase());
    }
  });

  document.addEventListener('click', function (e) {
    if (!searchContainer.contains(e.target)) {
      searchResults.classList.remove('active');
    }
  });

  function performSearch(query) {
    const results = [];
    const searchTerms = query.split(/\s+/).filter((term) => term.length > 0);

    if (!searchIndex || searchIndex.length === 0) {
      console.error('Search index is empty or not loaded');
      return;
    }

    searchIndex.forEach((pageData) => {
      if (!pageData || !pageData.sections) return;
      pageData.sections.forEach((section) => {
        if (!section || !section.title || !section.content) return;
        const titleLower = section.title.toLowerCase();
        const contentLower = section.content.toLowerCase();
        const titleMatch = searchTerms.every((term) => titleLower.includes(term));
        const contentMatch = searchTerms.every((term) => contentLower.includes(term));

        if (titleMatch || contentMatch) {
          const relevance = titleMatch ? 2 : 1;
          results.push({
            page: pageData.page,
            pageTitle: pageData.title,
            section: section.title,
            content: section.content,
            id: section.id || null,
            relevance: relevance,
          });
        }
      });
    });

    results.sort((a, b) => b.relevance - a.relevance);
    displayResults(results.slice(0, 10), query);
  }

  function displayResults(results, query) {
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-results-empty">No results found</div>';
      searchResults.classList.add('active');
      return;
    }

    const searchTerms = query.split(/\s+/).filter((term) => term.length > 0);

    searchResults.innerHTML = results
      .map((result) => {
        const highlightedTitle = highlightText(result.section, searchTerms);
        const snippet = truncateText(result.content, 100);
        const highlightedSnippet = highlightText(snippet, searchTerms);

        return `
        <div class="search-results-item" data-page="${result.page}" data-section="${result.section}" data-id="${
          result.id || ''
        }">
          <div class="search-results-item-title">${highlightedTitle}</div>
          <div class="search-results-item-path">${result.pageTitle}</div>
          <div class="search-results-item-snippet">${highlightedSnippet}</div>
        </div>
      `;
      })
      .join('');

    searchResults.querySelectorAll('.search-results-item').forEach((item) => {
      item.addEventListener('click', function () {
        const page = this.dataset.page;
        const section = this.dataset.section;
        const id = this.dataset.id;
        navigateToResult(page, section, id);
      });
    });

    searchResults.classList.add('active');
  }

  function highlightText(text, terms) {
    let highlighted = text;
    terms.forEach((term) => {
      const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
      highlighted = highlighted.replace(regex, '<span class="highlight">$1</span>');
    });
    return highlighted;
  }

  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function navigateToResult(page, section, id) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (page === currentPage) {
      let element = null;

      if (id) {
        element = document.getElementById(id);
      }

      if (!element) {
        const sectionId = section
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
        element = document.getElementById(sectionId);
      }

      if (!element) {
        const headings = document.querySelectorAll('h2, h3, h4');
        const normalizedSection = section.replace(/[()]/g, '');
        for (let heading of headings) {
          const headingText = heading.textContent.trim();
          if (
            headingText === section ||
            headingText.includes(section) ||
            headingText.replace(/[()]/g, '') === normalizedSection
          ) {
            element = heading;
            break;
          }
        }
      }

      if (element) {
        const offsetTop = element.offsetTop - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth',
        });
        const elementId =
          element.id ||
          id ||
          section
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
        window.location.hash = elementId;
      }
    } else {
      const sectionId =
        id ||
        section
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
      window.location.href = `${page}#${sectionId}`;
    }

    searchResults.classList.remove('active');
    searchInput.blur();
  }
}
