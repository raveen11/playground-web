# The Complete "Signup to Login" Full-Stack Flow

Welcome! This walkthrough explains exactly what happens when a user signs up and logs in to our application. It's written for a beginner full-stack developer to help you understand how the React frontend, Node.js backend, and PostgreSQL database all talk to each other.

---

## 1. The Frontend (React & Next.js)

It all starts in the browser when the user interacts with the UI.

### The Signup Page (`frontend/src/app/signup/page.tsx`)
1. **The Form**: The user fills out a form with their Company Name, Company Slug, Full Name, Email, and Password.
2. **State Management**: We use React's `useState` hook to keep track of what the user is typing (`formData`).
3. **Submission**: When the user clicks "Sign Up", the `handleSubmit` function is triggered. 
   - We prevent the default form submission (`e.preventDefault()`).
   - We set a loading state to true (so we can show a "Creating account..." button).
   - We call our API client: `await api.auth.signup(formData)`.
4. **Redirection**: If successful, we use Next.js's `useRouter` hook (`router.push("/login")`) to send the user to the login page.

### The API Client (`frontend/src/lib/apiClient.ts`)
Instead of writing raw `fetch` calls everywhere, we created a helper wrapper.
- **What it does**: It automatically adds the `Content-Type: application/json` header and converts our JavaScript `formData` object into a JSON string.
- **Cookies**: It sets `credentials: "include"`, which is critical because it tells the browser to automatically send and receive HTTP-only cookies (which our backend uses for authentication).

---

## 2. The Backend Routing (Express)

When the frontend makes a `POST` request to `http://localhost:3001/api/signup`, the request hits our Node.js/Express server.

1. **`server/src/api/app.ts`**: This is the entry point for the server. It receives the request and sees the `/api/signup` path. It passes the request to the `signupRouter`.
2. **`server/src/api/routes/signup.routes.ts`**: The router defines what happens next. It has a specific instruction: `signupRouter.post("/", validateBody(signupSchema), signup);`
3. **Validation (Zod Middleware)**: Before the request even reaches our main logic, it goes through `validateBody(signupSchema)`. We use a library called **Zod** (in `auth.schemas.ts`) to ensure the email is actually an email, the password is at least 8 characters long, and the company slug doesn't contain spaces. If the data is bad, the backend immediately returns a `400 Bad Request` error.

---

## 3. The Backend Controller (The Brain)

If the data is valid, it reaches the `signup` function inside `server/src/api/controllers/auth.controller.ts`. Here is the step-by-step logic:

1. **Check for Duplicates**: 
   - It queries the database (using Prisma): "Does a user with this email already exist?"
   - "Does a company with this slug already exist?"
   - If yes to either, it returns a `409 Conflict` error.
2. **Hash the Password**: 
   - **Crucial Security Step**: We NEVER save plain-text passwords in the database. 
   - We use `argon2` (a highly secure hashing algorithm inside `password.ts`) to turn `"mySecret123"` into a random, irreversible string of gibberish (a "hash").
3. **Database Transaction**:
   - We need to create both a `Company` and a `User`. If creating the Company succeeds but the User fails, we'd have a broken "orphan" company.
   - We use a **Prisma Transaction** (`prisma.$transaction`). This guarantees that either *both* are created successfully, or *neither* are created (rolling back on error).
   - It creates the `Company` (status: "pending").
   - It creates the `User` (role: "company_admin", linking it to the new `companyId`, saving the `passwordHash`).
4. **Create Session & Cookies**:
   - It creates access and refresh tokens for the user (`createSessionTokens`).
   - It attaches these tokens to the HTTP response as **HTTP-only cookies** (`setAuthCookies(res, ...)`). HTTP-only means malicious JavaScript in the browser cannot read them, preventing XSS attacks.
5. **Return Success**: It responds with a `201 Created` status and JSON containing the new user's public info (stripping out the password hash!).

---

## 4. The Database (Prisma & PostgreSQL)

**Prisma** is our ORM (Object-Relational Mapper). It allows us to write TypeScript code instead of raw SQL queries.

In `server/prisma/schema.prisma`, we defined our database structure:
- **`model Company`**: Has an `id` (UUID), `name`, `slug`, and `status`.
- **`model User`**: Has an `id`, `email`, `passwordHash`, `name`, `role`, and a `companyId`.
  - Notice the relationship: `company Company? @relation(fields: [companyId], references: [id])`. This tells Prisma (and PostgreSQL) that the `companyId` in the User table is a Foreign Key pointing to the `id` in the Company table.

When we wrote `tx.company.create({...})` in the controller, Prisma automatically generated the SQL `INSERT INTO "Company" (...) VALUES (...)` and ran it against our PostgreSQL database.

---

## 5. The Login Flow

Now the user is on the `/login` page and wants to log back in. The flow is very similar:

1. **Frontend**: The user enters their email and password in `frontend/src/app/login/page.tsx` and submits. `api.auth.login()` sends a `POST /api/auth/login`.
2. **Routing**: `app.ts` -> `auth.routes.ts` -> `loginSchema` validation.
3. **Controller (`login` in `auth.controller.ts`)**:
   - Uses Prisma to find the user by their email: `prisma.user.findUnique({ where: { email } })`.
   - Checks if the user actually exists and has an "active" status.
   - **Password Verification**: It takes the plain text password from the login form and the saved hash from the database, and feeds them into `argon2.verify()`. Argon2 hashes the provided password and checks if the result matches the database hash.
   - **Session Creation**: If it matches, it generates new tokens, sets them in HTTP-only cookies, and returns the user object.
4. **Frontend Success**: The frontend receives a `200 OK` and redirects the user to the dashboard (`router.push("/")`). Because the cookies were set, every subsequent API request the browser makes will automatically include those session cookies, proving the user is logged in!

---

## Summary of the Full Stack Flow
1. **React UI** captures user input.
2. **API Wrapper (fetch)** sends HTTP POST with JSON.
3. **Express Router** receives it, **Zod** validates it.
4. **Controller** applies business logic (password hashing).
5. **Prisma (ORM)** translates logic into **SQL** to save in **PostgreSQL**.
6. **Controller** creates session tokens and sets secure Cookies.
7. **Express** sends a JSON response back.
8. **React UI** redirects the user based on the response.
