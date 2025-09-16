// Enhanced Turbyoot server demonstrating new API features
import {
  FluentRouter,
  createResource,
} from "./framework/core.js";
import { Turbyoot } from "./framework/index.js";
import {
  cors,
  helmet,
  rateLimit,
  validate,
  requestId,
  compression,
  timeout,
  validateQuery,
  cache,
  auth,
  requireAuth,
  requireRole,
  setAuthCookie,
  clearAuthCookie,
} from "./framework/middleware.js";
import { AuthUser } from "./framework/types.js";
import { initCache } from "./framework/utils/index.js";

initCache();

const app = new Turbyoot();

// Auth configuration
const authOptions = {
  cookieName: "turbyoot-auth",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  sameSite: "lax" as const,
  tokenExtractor: (ctx: any) => {
    return ctx.req.headers.authorization?.replace("Bearer ", "") || null;
  },
  userResolver: async (token: string): Promise<AuthUser | null> => {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[0], "base64").toString()
      );
      return {
        id: payload.userId,
        email: payload.email,
        roles: payload.roles || ["user"],
      };
    } catch {
      return null;
    }
  },
};

// Global middleware
app.use(requestId());
app.use(cors({ origin: "*", credentials: true }));
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(compression());
app.use(timeout({ timeout: 30000 }));
app.use(auth(authOptions));

// ========================================
// 1. FLUENT API EXAMPLES
// ========================================

console.log("Setting up Fluent API examples...");

// Fluent chaining API
app.route()
  .use(requireAuth())
  .get("/fluent/hello", (ctx) => {
    ctx.ok({ message: "Hello from fluent API!", user: ctx.state.user });
  })
  .post("/fluent/echo", (ctx) => {
    ctx.created({ 
      message: "Echo from fluent API", 
      data: ctx.body,
      timestamp: new Date().toISOString()
    });
  })
  .group("/api/v1", (router) => {
    router
      .get("/status", (ctx) => {
        ctx.ok({ status: "API v1 is running" });
      })
      .get("/version", (ctx) => {
        ctx.ok({ version: "1.0.0", framework: "Turbyoot Enhanced" });
      });
  });

// ========================================
// 2. RESOURCE-BASED ROUTING
// ========================================

console.log("📦 Setting up Resource-based routing...");

// Simple resource with custom handlers
app.resource("posts", {
  // middleware: [requireAuth()],
  prefix: "/api",
  handlers: {
    index: (ctx) => {
      ctx.ok({
        message: "Get all posts",
        posts: [
          { id: 1, title: "First Post", content: "Hello World" },
          { id: 2, title: "Second Post", content: "Another post" }
        ],
        user: ctx.state.user
      });
    },
    show: (ctx) => {
      const { id } = ctx.params;
      ctx.ok({
        message: `Get post ${id}`,
        post: { id: Number(id), title: `Post ${id}`, content: "Post content" },
        user: ctx.state.user
      });
    },
    create: (ctx) => {
      ctx.created({
        message: "Post created successfully",
        post: { id: Math.floor(Math.random() * 1000), ...ctx.body },
        user: ctx.state.user
      });
    },
    update: (ctx) => {
      const { id } = ctx.params;
      ctx.ok({
        message: `Post ${id} updated`,
        post: { id: Number(id), ...ctx.body },
        user: ctx.state.user
      });
    },
    destroy: (ctx) => {
      const { id } = ctx.params;
      ctx.noContent();
    }
  }
});

// Resource with only specific actions and custom handlers
app.resource("users", {
  only: ["index", "show", "create"],
  middleware: [requireAuth()],
  prefix: "/api",
  handlers: {
    index: (ctx) => {
      ctx.ok({
        message: "Get all users",
        users: [
          { id: 1, name: "John Doe", email: "john@example.com" },
          { id: 2, name: "Jane Smith", email: "jane@example.com" }
        ],
        user: ctx.state.user
      });
    },
    show: (ctx) => {
      const { id } = ctx.params;
      ctx.ok({
        message: `Get user ${id}`,
        user: { id: Number(id), name: `User ${id}`, email: `user${id}@example.com` },
        currentUser: ctx.state.user
      });
    },
    create: (ctx) => {
      ctx.created({
        message: "User created successfully",
        user: { id: Math.floor(Math.random() * 1000), ...ctx.body },
        currentUser: ctx.state.user
      });
    }
  }
});

// Resource with custom middleware and handlers
app.resource("admin", {
  except: ["destroy"],
  middleware: [requireAuth(), requireRole("admin")],
  prefix: "/api",
  handlers: {
    index: (ctx) => {
      ctx.ok({
        message: "Admin dashboard data",
        stats: { totalUsers: 100, totalPosts: 50 },
        user: ctx.state.user
      });
    },
    show: (ctx) => {
      const { id } = ctx.params;
      ctx.ok({
        message: `Admin view of resource ${id}`,
        data: { id: Number(id), adminData: "Sensitive admin information" },
        user: ctx.state.user
      });
    },
    create: (ctx) => {
      ctx.created({
        message: "Admin resource created",
        data: { id: Math.floor(Math.random() * 1000), ...ctx.body },
        user: ctx.state.user
      });
    },
    update: (ctx) => {
      const { id } = ctx.params;
      ctx.ok({
        message: `Admin resource ${id} updated`,
        data: { id: Number(id), ...ctx.body },
        user: ctx.state.user
      });
    },
    patch: (ctx) => {
      const { id } = ctx.params;
      ctx.ok({
        message: `Admin resource ${id} patched`,
        data: { id: Number(id), ...ctx.body },
        user: ctx.state.user
      });
    }
  }
});

// ========================================
// 3. SIMPLE ROUTE EXAMPLES
// ========================================

console.log("Setting up Simple route examples...");

// Simple route examples without decorators
app.get("/simple/users", requireAuth(), (ctx) => {
  ctx.ok({
    message: "Get all users (simple approach)",
    users: [
      { id: 1, name: "John Doe", email: "john@example.com" },
      { id: 2, name: "Jane Smith", email: "jane@example.com" }
    ]
  });
});

app.get("/simple/users/:id", requireAuth(), (ctx) => {
  const { id } = ctx.params;
  ctx.ok({
    message: `Get user ${id} (simple approach)`,
    user: { id: Number(id), name: `User ${id}`, email: `user${id}@example.com` }
  });
});

app.post("/simple/users", requireAuth(), (ctx) => {
  ctx.created({
    message: "User created successfully (simple approach)",
    user: ctx.body,
    id: Math.floor(Math.random() * 1000)
  });
});

// ========================================
// 3. ENHANCED CONTEXT METHODS
// ========================================

console.log("Setting up Enhanced Context examples...");

// Demonstrate new context methods
app.get("/context-examples", (ctx) => {
  // Chaining responses
  ctx
    .header("X-Custom-Header", "Turbyoot-Enhanced")
    .cookie("session", "abc123", { httpOnly: true, maxAge: 3600 })
    .ok({
      message: "Enhanced context methods demo",
      features: [
        "Fluent response chaining",
        "Intuitive status methods",
        "Cookie management",
        "Header helpers",
        "Request helpers"
      ],
      requestInfo: {
        contentType: ctx.is("application/json"),
        accepts: ctx.accepts(["application/json", "text/html"]),
        userAgent: ctx.get("user-agent")
      }
    });
});

// Error handling examples
app.get("/error-examples", (ctx) => {
  const errorType = ctx.query.type || "badRequest";
  
  switch (errorType) {
    case "badRequest":
      ctx.badRequest("This is a bad request example");
      break;
    case "unauthorized":
      ctx.unauthorized("You need to be logged in");
      break;
    case "forbidden":
      ctx.forbidden("You don't have permission");
      break;
    case "notFound":
      ctx.notFound("Resource not found");
      break;
    case "conflict":
      ctx.conflict("Resource already exists");
      break;
    case "unprocessableEntity":
      ctx.unprocessableEntity("Validation failed");
      break;
    case "tooManyRequests":
      ctx.tooManyRequests("Rate limit exceeded");
      break;
    case "internalError":
      ctx.internalError("Something went wrong");
      break;
    default:
      ctx.ok({ message: "No error type specified" });
  }
});

// ========================================
// 4. PLUGIN SYSTEM
// ========================================

console.log("🔌 Setting up Plugin system...");

// Example plugin
const loggingPlugin = {
  name: "enhanced-logging",
  version: "1.0.0",
  install(app: Turbyoot) {
    app.use(async (ctx: any, next: () => Promise<void>) => {
      const start = Date.now();
      await next();
      
      const ms = Date.now() - start;
      console.log(`${ctx.req.method} ${ctx.req.url} - ${ctx.statusCode} (${ms}ms)`);
    });
  }
};

// Register and install plugin
app.plugin(loggingPlugin);

// ========================================
// 5. COMPARISON WITH EXPRESS-LIKE API
// ========================================

console.log("🔄 Setting up comparison examples...");

// Traditional Express-like API (still supported)
app.get("/traditional/hello", (ctx) => {
  ctx.status(200).json({ message: "Traditional Express-like API" });
});

app.post("/traditional/echo", (ctx) => {
  ctx.status(201).json({ 
    message: "Traditional POST response",
    data: ctx.body 
  });
});

// Enhanced API (new and improved)
app.route()
  .get("/enhanced/hello", (ctx) => {
    ctx.ok({ message: "Enhanced fluent API" });
  })
  .post("/enhanced/echo", (ctx) => {
    ctx.created({ 
      message: "Enhanced POST response",
      data: ctx.body 
    });
  });

// ========================================
// 6. VALIDATION EXAMPLES
// ========================================

console.log("Setting up Validation examples...");

const userValidation = validate({
  schema: {
    body: {
      name: { required: true, type: "string", minLength: 2, maxLength: 50 },
      email: {
        required: true,
        type: "string",
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      age: { type: "number", min: 0, max: 120 },
    },
  },
});

app.route()
  .use(userValidation)
  .post("/validated/users", (ctx) => {
    ctx.created({
      message: "User created with validation",
      user: ctx.body
    });
  });

// ========================================
// 7. CACHING EXAMPLES
// ========================================

console.log("💾 Setting up Caching examples...");

app.route()
  .use(cache({ maxAge: 300, public: true }))
  .get("/cached/data", (ctx) => {
    ctx.ok({
      message: "This data is cached for 5 minutes",
      timestamp: new Date().toISOString(),
      cacheInfo: "Check Cache-Control header"
    });
  });

// ========================================
// 8. AUTHENTICATION EXAMPLES
// ========================================

console.log("Setting up Authentication examples...");

app.post("/auth/login", (ctx) => {
  const token = "fake-jwt-token";
  setAuthCookie(ctx, token, authOptions);
  ctx.ok({
    message: "Login successful",
    token,
    user: { id: "1", email: "user@example.com" }
  });
});

app.post("/auth/logout", (ctx) => {
  clearAuthCookie(ctx, authOptions);
  ctx.ok({ message: "Logout successful" });
});

app.route()
  .use(requireAuth())
  .get("/protected", (ctx) => {
    ctx.ok({
      message: "This is a protected route",
      user: ctx.state.user
    });
  });

app.route()
  .use(requireRole("admin"))
  .get("/admin-only", (ctx) => {
    ctx.ok({
      message: "This is an admin-only route",
      user: ctx.state.user
    });
  });

// ========================================
// 9. HEALTH CHECK
// ========================================

app.get("/health", app.healthCheck([
  {
    name: "database",
    check: async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    },
    timeout: 1000,
  },
  {
    name: "cache",
    check: async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return true;
    },
    timeout: 500,
  },
]));

// ========================================
// START SERVER
// ========================================

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`\nEnhanced Turbyoot server listening on http://localhost:${port}`);
  console.log("\n📚 Available endpoints:");
  console.log("  • Fluent API: /fluent/hello, /fluent/echo");
  console.log("  • Resource routing: /api/posts, /api/users, /api/admin");
  console.log("  • Simple routes: /simple/users");
  console.log("  • Enhanced context: /context-examples");
  console.log("  • Error examples: /error-examples?type=badRequest");
  console.log("  • Validation: POST /validated/users");
  console.log("  • Caching: /cached/data");
  console.log("  • Auth: /auth/login, /auth/logout, /protected, /admin-only");
  console.log("  • Health check: /health");
  console.log("\nTry the new fluent API - it's much more intuitive than Express!");
});
