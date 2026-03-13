# Authentication Flow — Complete In-Depth Analysis

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Token Infrastructure](#2-token-infrastructure)
3. [Password Hashing](#3-password-hashing)
4. [All Auth Endpoints](#4-all-auth-endpoints)
5. [Login Flow — Step by Step](#5-login-flow--step-by-step)
6. [Signup / Registration Flow](#6-signup--registration-flow)
7. [Frontend Auth State Management](#7-frontend-auth-state-management)
8. [How Tokens Are Attached to Requests](#8-how-tokens-are-attached-to-requests)
9. [Session Persistence on Page Reload](#9-session-persistence-on-page-reload)
10. [Backend Token Middleware Chain](#10-backend-token-middleware-chain)
11. [Role & Permission System](#11-role--permission-system)
12. [Email Verification Flow](#12-email-verification-flow)
13. [Password Reset Flow](#13-password-reset-flow)
14. [Frontend Route Guards](#14-frontend-route-guards)
15. [Token Expiry & Error Handling](#15-token-expiry--error-handling)
16. [Logout](#16-logout)
17. [Refresh Tokens — Current State](#17-refresh-tokens--current-state)
18. [Complete End-to-End Narrative](#18-complete-end-to-end-narrative)
19. [Security Analysis](#19-security-analysis)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND  (Vue 3 + Pinia)                         │
│                                                                            │
│  Pages: Login.vue  Join.vue  App.vue  passwordReset/Confirm.vue            │
│  Store: store/user.ts  (Pinia)   ←→   localStorage["user"]                │
│  Modules: modules/auth.ts  modules/users.ts  (raw axios calls)             │
│  Guards: router.ts (beforeEnter)                                           │
│  Error handler: utils/tokenError.ts                                        │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │  HTTP  Authorization: Bearer <JWT>
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND  (Node.js + Express)                       │
│                                                                            │
│  Routes:       routes/v1/auth.js  routes/v1/users.js  …                   │
│  Middleware:   middlewares/userExists.js                                   │
│                middlewares/authenticate.js   ← full auth + permissions     │
│                middlewares/authorize.js      ← permissions gate            │
│                middlewares/token.js          ← simple auth (older routes)  │
│                middlewares/validateEmailToken.js                           │
│  Controllers:  controllers/auth/login.js  signup.js  password/*  email/*  │
│  Services:     services/token.service.js  services/auth/createUser.js …   │
│  Database:     PostgreSQL  (users, roles, permissions, emailVerification,  │
│                             resetPassword, roles_users, permissions_roles) │
└────────────────────────────────────────────────────────────────────────────┘
```

**Token type:** Stateless JWT (no server-side session table)  
**No refresh tokens implemented** — single auth token with 2-day expiry

---

## 2. Token Infrastructure

**File:** `packages/server/services/token.service.js`

Single place for all JWT operations in the project:

```js
const createToken = (data, payload) => {
  const secretKey = process.env.LOGCHIMP_SECRET_KEY || config.server.secretKey;
  return jwt.sign(data, secretKey, payload);   // HS256 by default
};

const verifyToken = (token) => {
  if (!_.isString(token)) return null;
  const secretKey = process.env.LOGCHIMP_SECRET_KEY || config.server.secretKey;
  return jwt.verify(token, secretKey);         // throws on expiry or bad sig
};
```

| Property | Value |
|---|---|
| Algorithm | HS256 (HMAC SHA-256, jsonwebtoken default) |
| Signing secret | `LOGCHIMP_SECRET_KEY` env var → fallback `logchimp.config.json → server.secretKey` |
| **Auth token expiry** | `"2d"` (48 hours) — set at login and signup |
| **Email verification token expiry** | `"2h"` (2 hours) |
| **Password reset token expiry** | `"2h"` (2 hours) |

### JWT Payload Structures

**Auth token** (login / signup):
```json
{
  "userId": "uuid-v4",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Email verification token**:
```json
{
  "userId": "uuid-v4",
  "email": "user@example.com",
  "type": "emailVerification",
  "iat": ...,
  "exp": ...
}
```

**Password reset token**:
```json
{
  "userId": "uuid-v4",
  "email": "user@example.com",
  "type": "resetPassword",
  "iat": ...,
  "exp": ...
}
```

> The `type` field in email/password tokens serves a dual purpose: it identifies token intent **and** is used as the **DB table name** to look up the stored token record (`emailVerification` or `resetPassword`).

---

## 3. Password Hashing

**File:** `packages/server/utils/password.js`

```js
// bcryptjs, salt rounds = 10
exports.hashPassword = (password) => {
  const bcryptSalt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, bcryptSalt);   // synchronous hash
};

exports.validatePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);    // async compare
};
```

| Property | Value |
|---|---|
| Library | `bcryptjs` |
| Salt rounds | 10 |
| Hash method | `genSaltSync` + `hashSync` (sync on write) |
| Verify method | `bcrypt.compare` (async on read) |
| Plain password exposure | Stripped from `req.user` before passing to any controller |

---

## 4. All Auth Endpoints

**File:** `packages/server/routes/v1/auth.js`

| Method | Endpoint | Middleware Chain | Controller |
|---|---|---|---|
| POST | `/api/v1/auth/signup` | `mailConfigExists` | `auth.signup` |
| POST | `/api/v1/auth/login` | `userExists` | `auth.login` |
| POST | `/api/v1/auth/setup` | `mailConfigExists` | `auth.setup` |
| GET | `/api/v1/auth/setup` | — | `auth.isSiteSetup` |
| POST | `/api/v1/auth/email/verify` | `mailConfigExists`, `userExists` | `auth.email.verify` |
| POST | `/api/v1/auth/email/validate` | `validateEmailToken`, `userExists` | `auth.email.validate` |
| POST | `/api/v1/auth/password/reset` | `mailConfigExists`, `userExists` | `auth.password.reset` |
| POST | `/api/v1/auth/password/validateToken` | `validateEmailToken`, `userExists` | `auth.password.validateToken` |
| POST | `/api/v1/auth/password/set` | `validateEmailToken`, `userExists` | `auth.password.set` |

**Protected user endpoints** (`routes/v1/users.js`):

| Method | Endpoint | Middleware Chain | Controller |
|---|---|---|---|
| GET | `/api/v1/users/profile` | `apiAuth` = `[authenticate, authorize]` | `users.getProfile` |
| PATCH | `/api/v1/users/profile` | `apiAuth` | `users.updateProfile` |
| GET | `/api/v1/users/permissions` | `apiAuth` | `users.getUserPermissions` |
| GET | `/api/v1/users/dashboard` | `apiAuth` | `users.accessDashboard` |

> `middleware.apiAuth` = `[authenticate, authorize]` — always both middleware in sequence

---

## 5. Login Flow — Step by Step

### Route
```
POST /api/v1/auth/login
  → userExists  (middleware)
  → auth.login  (controller)
```

### Step 1 — `userExists` Middleware
**File:** `packages/server/middlewares/userExists.js`

```
req.body.email
  │
  ├─ validEmail(email) fails? → 400 EMAIL_INVALID
  │
  ├─ SELECT * FROM users WHERE email = ?  (case-sensitive)
  │     └─ row not found? → 404 USER_NOT_FOUND
  │
  └─ req.user = <full DB row, including hashed password>  →  next()
```

The `userExists` middleware is **reused** across login, password reset, and email verification routes. It always attaches the full user row (including `password` hash) to `req.user`.

### Step 2 — `login` Controller
**File:** `packages/server/controllers/auth/login.js`

```
req.user  (populated by userExists)
  │
  ├─ user.isBlocked?     → 403 USER_BLOCKED
  ├─ !req.body.password? → 400 PASSWORD_MISSING
  │
  ├─ bcrypt.compare(req.body.password, user.password)
  │     └─ mismatch? → 403 INCORRECT_PASSWORD
  │
  ├─ tokenPayload = { userId: user.userId, email: user.email }
  ├─ authToken = createToken(tokenPayload, { expiresIn: "2d" })
  │
  ├─ SELECT isOwner FROM users WHERE userId = ?   ← separate query for isOwner
  │
  └─ 200 → {
              user: {
                authToken,
                userId, name, username, email, avatar, isOwner
              }
            }
```

> Password is **never** returned in the response. The response shape is explicit — only safe fields are included.

### Step 3 — Frontend Handles the Response
**File:** `packages/theme/src/pages/Login.vue`

```ts
async function login() {
  // 1. client-side validation gate
  if (!email.value || !password.value) { /* show field errors */ return; }

  try {
    const response = await signin({ email: email.value, password: password.value });

    // 2. persist user to Pinia + localStorage
    setUser(response.data.user);

    // 3. immediately fetch permissions from server (validates token implicitly)
    const permissions = await getPermissions();
    setPermissions(permissions.data.permissions);

    // 4. redirect: ?redirect param OR homepage
    router.push(route.query.redirect?.toString() || "/");

  } catch (error) {
    if (error.response.data.code === "USER_NOT_FOUND")   { emailError.show = true; }
    if (error.response.data.code === "INCORRECT_PASSWORD") { passwordError.show = true; }
  }
}
```

### Step 4 — `setUser` Stores Token
**File:** `packages/theme/src/store/user.ts`

```ts
function setUser(payload) {
  authToken.value  = payload.authToken || "";
  user.userId      = payload.userId    || "";
  user.name        = payload.name      || "";
  user.username    = payload.username  || "";
  user.email       = payload.email     || "";
  user.avatar      = payload.avatar    || "";
  user.isOwner     = payload.isOwner   ?? false;

  // Persist entire user object including token to localStorage
  localStorage.setItem("user", JSON.stringify({ authToken: authToken.value, ...user }));
}
```

Token lives in **two places simultaneously**:
- **Pinia reactive ref** `authToken` — in-memory, reactive, lost on browser close
- **`localStorage["user"]`** — serialised JSON, survives page reloads and browser restarts

---

## 6. Signup / Registration Flow

### Route
```
POST /api/v1/auth/signup
  → mailConfigExists  (middleware — ensures mail server is configured)
  → auth.signup       (controller)
  → createUser()      (service)
```

### Signup Controller
**File:** `packages/server/controllers/auth/signup.js`

```
req.body { email, password }
  │
  ├─ validEmail(email) fails? → 400 EMAIL_INVALID
  ├─ !password?               → 400 PASSWORD_MISSING
  │
  ├─ SELECT allowSignup FROM settings
  │     └─ allowSignup = false? → 400 SIGNUP_NOT_ALLOWED
  │
  └─ createUser(req, res, next, { email, password })
```

### `createUser` Service
**File:** `packages/server/services/auth/createUser.js`

```
{ email, password }
  │
  ├─ Check EXISTS(SELECT * FROM users WHERE LOWER(email) = LOWER(?))
  │     └─ exists? → 409 USER_EXISTS (via res.status())
  │
  ├─ userId    = uuidv4(email)
  ├─ username  = email.split("@")[0]
  ├─ avatar    = "https://www.gravatar.com/avatar/" + md5(email)
  ├─ password  = bcrypt.hashSync(password, genSaltSync(10))
  │
  ├─ INSERT INTO users (userId, name, username, email, avatar, password, ...)
  │     RETURNING userId, name, username, email, avatar
  │
  ├─ SELECT id FROM roles WHERE name = "@everyone"
  ├─ INSERT INTO roles_users (id, role_id, user_id)   ← assign default role
  │
  ├─ tokenPayload = { userId, email, type: "emailVerification" }
  ├─ verifyEmail(url, tokenPayload)    ← async: creates DB record + sends email
  │
  ├─ authToken = createToken(tokenPayload, { expiresIn: "2d" })
  │
  └─ return { authToken, userId, name, username, email, avatar }
```

**Key distinction from login token:** Signup token payload includes `type: "emailVerification"`. The account is usable immediately (token returned), but email is unverified (`isVerified = false` in DB).

### Frontend Signup Page
**File:** `packages/theme/src/pages/Join.vue`

Same pattern as login: call `signup()` → `login(response.data.user)` (calls `setUser`) → `getPermissions()` → redirect.

---

## 7. Frontend Auth State Management

**File:** `packages/theme/src/store/user.ts` (Pinia store)

### State Shape
```ts
const authToken  = ref<string>("");
const user = reactive({
  userId:   "",
  name:     "",
  username: "",
  email:    "",
  avatar:   "",
  isOwner:  false,
});
const permissions = ref<string[]>([]);
```

### Actions

| Action | What it does |
|---|---|
| `setUser(payload)` | Writes all user fields + authToken to Pinia; syncs to `localStorage["user"]` |
| `login(payload)` | Alias for `setUser` |
| `setPermissions(payload)` | Writes string array of permissions (e.g. `["post:read", "post:publish"]`) |
| `logout()` | Calls `setUser({})`, clears permissions, removes localStorage key, navigates to `/` |

### Computed Getters

| Getter | Returns |
|---|---|
| `getUser` | Full reactive user object |
| `getUserId` | `user.userId` — used by route guards as the "is logged in?" check |

### localStorage Key
```json
{
  "authToken": "eyJ...",
  "userId":    "uuid",
  "name":      "John",
  "username":  "john",
  "email":     "john@example.com",
  "avatar":    "https://www.gravatar.com/avatar/...",
  "isOwner":   false
}
```

---

## 8. How Tokens Are Attached to Requests

**There are NO axios interceptors.** Every module manually reads `authToken` from the Pinia store and constructs the `Authorization` header:

**File pattern used in:** `modules/users.ts`, `modules/votes.ts`, `modules/posts.ts`, etc.

```ts
// From modules/users.ts
export const getPermissions = async () => {
  const { authToken } = useUserStore();        // read from Pinia

  return await axios({
    method: "GET",
    url: `${VITE_API_URL}/api/v1/users/permissions`,
    headers: {
      Authorization: `Bearer ${authToken}`,   // manually attached every call
    },
  });
};
```

**Token data flow:**
```
localStorage["user"].authToken
  → JSON.parse → userStore.setUser()
    → Pinia: authToken.value
      → useUserStore().authToken
        → axios headers.Authorization = "Bearer <token>"
          → server
```

**No token auto-injection** (no axios instance with default headers, no request interceptor). Every protected call must explicitly get `authToken` from the store and pass it.

---

## 9. Session Persistence on Page Reload

**File:** `packages/theme/src/App.vue` (`onMounted`)

```ts
onMounted(async () => {
  getSiteSettings();   // always fetch site config

  const user = localStorage.getItem("user");
  if (user) {
    // 1. Hydrate Pinia from localStorage synchronously
    userStore.setUser(JSON.parse(user));

    try {
      // 2. Fetch fresh permissions from server — this is the implicit token validation
      //    GET /api/v1/users/permissions with Authorization: Bearer <token>
      //    If token is expired/invalid the server returns 401/404
      const permissions = await getPermissions();
      userStore.setPermissions(permissions.data.permissions);

    } catch (error) {
      // 3. Any auth error → logout + redirect
      tokenError(error);
    }
  }
});
```

This is the **only place token validity is actively checked on load**. There is no dedicated token validation endpoint — validity is inferred from whether `GET /api/v1/users/permissions` succeeds.

---

## 10. Backend Token Middleware Chain

### `middleware.apiAuth` = `[authenticate, authorize]`

**File:** `packages/server/middlewares/index.js`

```js
module.exports.apiAuth = [authenticate, authorize];
```

Every protected route on `users.js`, `posts.js`, etc. uses this two-middleware chain.

---

### Middleware 1: `authenticate.js` — Token + Identity

**File:** `packages/server/middlewares/authenticate.js`

```
Authorization: Bearer <token>
  │
  ├─ !req.headers?.authorization?  → 400 INVALID_AUTH_HEADER
  │
  ├─ extractTokenFromHeader(header)
  │     regex: /^Bearer$/i  →  token = second segment
  │     └─ fails? → 401 INVALID_AUTH_HEADER_FORMAT
  │
  ├─ jwt.decode(token, { complete: true })   ← NO VERIFICATION YET
  │     checks decoded?.header exists
  │     └─ fails? → 401 INVALID_JWT
  │
  ├─ userId = decoded.payload.userId
  │
  ├─ DB JOIN:
  │     SELECT u.userId, u.name, u.username, u.email,
  │            u.isOwner, u.isBlocked,
  │            ARRAY_AGG(r.id) AS roles
  │     FROM users AS u
  │     LEFT JOIN roles_users AS ru ON u.userId = ru.user_id
  │     LEFT JOIN roles AS r        ON ru.role_id = r.id
  │     GROUP BY u.userId
  │     WHERE userId = ?
  │     └─ not found? → 404 USER_NOT_FOUND
  │
  ├─ computePermissions(user):
  │     if isOwner:
  │         SELECT COALESCE(ARRAY_AGG(CONCAT(p.type,':',p.action)), '{}')
  │         FROM permissions p
  │         → returns ALL permissions in DB
  │     else:
  │         SELECT COALESCE(ARRAY_AGG(DISTINCT CONCAT(p.type,':',p.action)), '{}')
  │         FROM roles
  │         JOIN permissions_roles ON roles.id = permissions_roles.role_id
  │         JOIN permissions p     ON permissions_roles.permission_id = p.id
  │         WHERE roles.id IN (user.roles)
  │
  ├─ jwt.verify(token, secretKey)    ← REAL VERIFICATION (signature + expiry)
  │     TokenExpiredError    → 401 INVALID_TOKEN
  │     JsonWebTokenError    → 401 INVALID_TOKEN
  │     other error          → 500 SERVER_ERROR
  │
  └─ req.user = { ...user, permissions }  →  next()
```

---

### Middleware 2: `authorize.js` — Permissions Gate

**File:** `packages/server/middlewares/authorize.js`

```
req.user  (must be set by authenticate)
  │
  ├─ !req.user?.userId? → 401 AUTHORIZATION_FAILED
  ├─ req.user.isBlocked? → 403 USER_BLOCK
  ├─ req.user.permissions.length === 0? → 403 ACCESS_DENIED
  └─ next()
```

This is the **second gate** — after `authenticate` confirms identity, `authorize` confirms the user has at least one permission (i.e. has a role assigned). A user with no role at all is rejected here.

---

### Middleware 3: `token.js` — Simple Auth (legacy/older routes)

**File:** `packages/server/middlewares/token.js`

Same flow as `authenticate.js` except:
- Uses `SELECT * FROM users WHERE userId = ?` (no JOIN, no roles)
- Does **not** compute permissions
- Sets `res.locals.user` instead of `req.user`
- Password is explicitly nulled: `user.password = undefined`

---

### Decode-Before-Verify Pattern (both middlewares)

```
jwt.decode()   → cheap, no crypto, just reads payload → get userId
DB lookup      → check user exists + isBlocked (abort early if bad state)
jwt.verify()   → expensive crypto, signature + expiry
```

This avoids cryptographic work for tokens belonging to deleted or blocked users.

---

## 11. Role & Permission System

### Database Schema (relational)

```
users
  └─ userId, isOwner, isBlocked, ...

roles
  └─ id, name  (e.g. "@everyone", "moderator", ...)

roles_users                    ← M:M join
  └─ role_id, user_id

permissions
  └─ id, type, action          (e.g. type="post", action="publish")

permissions_roles              ← M:M join
  └─ permission_id, role_id
```

### Permission String Format

Permission identifiers are concatenated as `"type:action"`, e.g.:

```
"post:read"
"post:publish"
"board:create"
```

### Owner Shortcut

If `user.isOwner = true`, `computePermissions` returns **all** permissions from the `permissions` table — there is no per-permission check for the site owner.

### Signup Default Role

Every new user gets the `@everyone` role assigned at creation:

```js
// createUser.js
const getRole = await database.select().from("roles").where({ name: "@everyone" }).first();
await database.insert({ id: uuidv4(), role_id: getRole.id, user_id: newUser.userId }).into("roles_users");
```

---

## 12. Email Verification Flow

### Trigger Points
1. **Automatic** — during `POST /api/v1/auth/signup` (inside `createUser`)
2. **Manual resend** — `POST /api/v1/auth/email/verify`

### Service: `verifyEmail(url, tokenPayload)`
**File:** `packages/server/services/auth/verifyEmail.js`

```
1. token = createToken({ userId, email, type:"emailVerification" }, { expiresIn:"2h" })
2. DELETE FROM emailVerification WHERE email = ?     ← removes any old pending token
3. INSERT INTO emailVerification (email, token) RETURNING *
4. Build email with link: <origin>/email-verify/?token=<token>
5. Send email via nodemailer (from: noreply@<domain>)
```

### Validation: `POST /api/v1/auth/email/validate`

Middleware chain: `validateEmailToken` → `userExists` → `auth.email.validate`

```
validateEmailToken:
  jwt.verify(token, secretKey)           ← verify FIRST (signature + expiry)
  decoded.type = "emailVerification"
  SELECT * FROM emailVerification WHERE token = ?
  req.emailToken = row; req.user = { email }

auth.email.validate controller:
  if (req.user.isVerified) → 409 EMAIL_VERIFIED
  UPDATE users SET isVerified=true WHERE email=?
  DELETE FROM emailVerification WHERE email=?
  → 200 { verify: { success: true } }
```

The token record is **deleted after use** — single-use.

---

## 13. Password Reset Flow

### Step 1 — Request Reset

`POST /api/v1/auth/password/reset` → `mailConfigExists`, `userExists`, `auth.password.reset`

```
tokenPayload = { userId, email, type: "resetPassword" }
token = createToken(tokenPayload, { expiresIn: "2h" })
DELETE FROM resetPassword WHERE email = ?        ← invalidate old token
INSERT INTO resetPassword (email, token)
Send email: <origin>/password-reset/confirm/?token=<token>
```

### Step 2 — Validate Token (frontend page load)

`POST /api/v1/auth/password/validateToken` → `validateEmailToken`, `userExists`, `auth.password.validateToken`

```
validateEmailToken middleware:
  jwt.verify(token)
  SELECT * FROM resetPassword WHERE token = ?
  req.emailToken = row

validateToken controller:
  return { reset: { valid: emailToken, ...emailToken (non-prod only) } }
```

The frontend `passwordReset/Confirm.vue` calls this on mount to verify the token is still valid before showing the password form.

### Step 3 — Set New Password

`POST /api/v1/auth/password/set` → `validateEmailToken`, `userExists`, `auth.password.set`

```
req.body.password (missing?) → 400 PASSWORD_MISSING
hashedPassword = bcrypt.hashSync(password, genSaltSync(10))
UPDATE users SET password = ?, updatedAt = ? WHERE userId = ?
DELETE FROM resetPassword WHERE email = ?        ← consume token (single-use)
→ 200 { reset: { success: true } }
```

The reset token is **deleted after password change** — single-use, same as email verification tokens.

---

## 14. Frontend Route Guards

**File:** `packages/theme/src/router.ts`

### `/dashboard` — `beforeEnter` guard

```ts
beforeEnter: async (_, __, next) => {
  // 1. Check site setup
  const setup = await isSiteSetup();
  if (!setup.data.is_setup) return next({ name: "Setup welcome" });

  // 2. Check client-side login state (Pinia userId)
  const { getUserId } = useUserStore();
  if (!getUserId) return next({ name: "Login", query: { redirect: "/dashboard" } });

  // 3. Server-side permission check (sends token, validates access)
  const response = await checkUserDashboardAccess();
  if (response.data.access) return next();

  next({ name: "Home" });
};
```

Guard layers:
1. **Site setup check** — server call
2. **`getUserId` from Pinia** — client-only check (token could still be expired)
3. **`checkUserDashboardAccess()`** — actual server call with token

### `/setup` — `beforeEnter` guard

Redirects to `/dashboard` if site is already set up.

### `/login` and `/join` — `onMounted` check

```ts
onMounted(() => {
  if (getUserId) {  // already logged in?
    router.push(route.query.redirect?.toString() || "/");
  }
});
```

These pages redirect away if a user is already authenticated (prevents re-login).

---

## 15. Token Expiry & Error Handling

### Backend Error Codes

| Code | Status | Meaning |
|---|---|---|
| `INVALID_AUTH_HEADER` | 400 | No `Authorization` header |
| `INVALID_AUTH_HEADER_FORMAT` | 401 | Header doesn't start with `Bearer ` |
| `INVALID_JWT` | 401 | `jwt.decode()` returned nothing (malformed token) |
| `INVALID_TOKEN` | 401 | `jwt.verify()` failed — expired or wrong signature |
| `USER_NOT_FOUND` | 404 | Token decoded but `userId` not in DB |
| `USER_BLOCKED` | 403 | User account is blocked |
| `AUTHORIZATION_FAILED` | 401 | `req.user.userId` missing (authorize middleware) |
| `ACCESS_DENIED` | 403 | User has no permissions assigned |
| `USER_BLOCK` | 403 | isBlocked check in authorize middleware |

### Frontend: `tokenError.ts`

**File:** `packages/theme/src/utils/tokenError.ts`

Called from `App.vue` `onMounted` and anywhere a protected API call fails:

```ts
const tokenError = (error: any) => {
  const { logout } = useUserStore();

  logout();    // always logout first, regardless of error type

  const code = error.response.data.code;

  if (code === "USER_NOT_FOUND") {
    if (router.currentRoute.value.fullPath !== "/") router.push("/");
  }

  if (["INVALID_TOKEN", "INVALID_JWT"].includes(code)) {
    router.push("/login");
  }

  if (code === "INVALID_AUTH_HEADER_FORMAT") {
    router.push({ path: "/login", query: { redirect: router.currentRoute.value.fullPath } });
  }
};
```

**No proactive expiry check** — the frontend never parses the JWT `exp` claim. Expiry is only discovered when a server call returns 401.

---

## 16. Logout

**File:** `packages/theme/src/store/user.ts`

```ts
function logout() {
  // 1. Reset all Pinia state
  setUser({ authToken: "", userId: "", name: "", username: "", email: "", avatar: "", isOwner: false });

  // 2. Clear permissions
  setPermissions([]);

  // 3. Remove from localStorage
  localStorage.removeItem("user");

  // 4. Navigate home (unless already there)
  if (router.currentRoute.value.fullPath !== "/") {
    router.push("/");
  }
}
```

**There is no server-side `POST /logout` endpoint.** Logout is purely client-side:
- Pinia state is cleared
- `localStorage["user"]` is removed
- The JWT token is simply abandoned

The abandoned token remains **cryptographically valid** on the server for up to 2 days. Any actor who possesses a copy of the token can still use it until it expires.

---

## 17. Refresh Tokens — Current State

**There are no refresh tokens.** The system uses a single stateless JWT with a 2-day TTL.

| Property | Value |
|---|---|
| Refresh tokens | ❌ Not implemented |
| Token rotation | ❌ Not implemented |
| Server-side token invalidation | ❌ Not implemented |
| Forced logout mechanism | ❌ Not implemented |
| Token revocation on password change | ❌ Not implemented |

When the token expires, the user is silently logged out on next page load (`getPermissions()` → 401 → `tokenError()` → `logout()`).

---

## 18. Complete End-to-End Narrative

### A. User Logs In

1. User enters email + password on `/login` (Login.vue)
2. **Frontend:** `signin({ email, password })` → `POST /api/v1/auth/login`
3. **Backend — `userExists`:** Validates email format, queries `users` table by email. Attaches full DB row (including `password` hash) to `req.user`. 404 if not found.
4. **Backend — `login` controller:** Checks `isBlocked`. Checks password present. Runs `bcrypt.compare()`. On match, builds payload `{ userId, email }` and calls `createToken(..., { expiresIn: "2d" })`. Queries `isOwner`. Returns `{ user: { authToken, userId, name, username, email, avatar, isOwner } }`.
5. **Frontend:** Calls `setUser(response.data.user)` — writes authToken + user fields to Pinia and `localStorage["user"]`.
6. **Frontend:** Calls `GET /api/v1/users/permissions` with `Authorization: Bearer <token>`. Server runs `[authenticate, authorize]` chain, computes permissions, returns array. Frontend stores in Pinia.
7. **Frontend:** Redirects to `/` or `?redirect` query param.

---

### B. User Makes an Authenticated Request (e.g. cast a vote)

1. Component calls `createVote({ postId })` from `modules/votes.ts`
2. **Frontend:** `useUserStore().authToken` is read from Pinia (sourced from localStorage on reload)
3. Request sent: `POST /api/v1/votes` with `Authorization: Bearer eyJ...`
4. **Backend — `authenticate` middleware:**
   - Checks `Authorization` header
   - Parses `Bearer <token>`
   - `jwt.decode()` — extracts `userId` from payload (no crypto)
   - DB JOIN query: fetches user + roles
   - `computePermissions()`: if owner, all permissions; else role-based
   - `jwt.verify()` — verifies signature and expiry
   - Attaches `req.user = { ...user, permissions }`
5. **Backend — `authorize` middleware:** Checks `req.user.userId` present, user not blocked, has at least one permission
6. **Backend — vote controller:** Executes business logic with `req.user`
7. **Frontend:** Receives response, updates UI

---

### C. Page Reload

1. `App.vue` `onMounted` runs
2. `localStorage.getItem("user")` → parses JSON
3. `userStore.setUser(parsed)` — hydrates Pinia (authToken + user fields)
4. `getPermissions()` called → `GET /api/v1/users/permissions` with stored token
5. If 200: `setPermissions()` called — session fully restored
6. If 401/404: `tokenError(error)` → `logout()` → Pinia cleared, localStorage cleared, redirect to `/`

---

### D. Token Expiry Discovered Mid-Session

1. User has been inactive; token has reached 48h TTL
2. A protected API call is made (any action)
3. **Backend:** `jwt.verify()` throws `TokenExpiredError`
4. **Backend:** Returns `401 { code: "INVALID_TOKEN" }`
5. **Frontend:** The calling module's `.catch()` invokes `tokenError(error)`
6. `tokenError`: calls `logout()` → clears Pinia + localStorage → `router.push("/login")`
7. User lands on `/login` and must re-authenticate

---

### E. Password Reset

1. User clicks "Forgot password" → enters email → `POST /api/v1/auth/password/reset`
2. Server: creates JWT `{ userId, email, type:"resetPassword", exp: +2h }`, stores in `resetPassword` table, emails link `<origin>/password-reset/confirm/?token=<jwt>`
3. User opens link → `passwordReset/Confirm.vue` calls `validateResetPasswordToken(token)` on mount
4. Server: `validateEmailToken` middleware — `jwt.verify()` → queries `resetPassword` table → `req.emailToken` set
5. If valid: form shown; user enters new password → `POST /api/v1/auth/password/set`
6. Server: hashes new password → `UPDATE users SET password = ?` → `DELETE FROM resetPassword WHERE email = ?`
7. Token consumed — cannot be reused

---

## 19. Security Analysis

| Area | Current State | Risk / Note |
|---|---|---|
| **Token storage** | `localStorage` | XSS can read and exfiltrate tokens. `HttpOnly` cookies would prevent this. |
| **Token invalidation** | None | Logged-out / password-changed tokens remain valid for up to 2 days. No revocation list. |
| **Refresh tokens** | Not implemented | When token expires, user is silently logged out. No seamless re-auth. |
| **Signing secret fallback** | Falls back to `logchimp.config.json` | If config file is committed to version control with a weak secret, all tokens can be forged. Always set `LOGCHIMP_SECRET_KEY` in production env. |
| **Password hashing** | bcrypt, 10 salt rounds | Correctly implemented. `bcryptjs` is safe. 10 rounds is adequate. |
| **Password in response** | Never returned | Explicit field-selection in all response objects. |
| **Email token table name injection** | `decoded.type` used as DB table name | Safe only if JWT secret is uncompromised. If an attacker could forge a token with `type: "users"`, they could query arbitrary tables. Should validate `type` against an allowlist `["emailVerification", "resetPassword"]`. |
| **Decode-before-verify** | Used in both auth middlewares | Intentional optimisation — avoids crypto for blocked/deleted users. Not a vulnerability. |
| **`isBlocked` checked in 3 places** | `userExists` sets field; `login` controller checks; `authenticate` + `authorize` both check | Redundant but safe — blocked users are reliably rejected. |
| **No rate limiting on login** | Not visible in codebase | Brute-force attack on `POST /auth/login` is possible. No lockout or rate limiting seen. |
| **Signup allowance** | `settings.allowSignup` DB flag | Admins can disable public registration. |
| **Token expiry not checked client-side** | JWT `exp` claim never parsed on frontend | Expiry only discovered on next server round-trip. |
