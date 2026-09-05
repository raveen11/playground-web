import type { RequestHandler } from "express";
import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/auth/password.js";
import {
  clearAuthCookies,
  setAuthCookies,
} from "../../lib/auth/cookies.js";
import {
  createSessionTokens,
  publicUser,
  revokeRefreshToken,
  rotateSession,
} from "../../lib/auth/session.js";
import { readRefreshToken } from "../middleware/auth.middleware.js";
import type { LoginInput, SignupInput } from "../schemas/auth.schemas.js";
import { googleClient } from "../../config/google.js";

export const signup: RequestHandler = async (req, res) => {
  const body = req.body as SignupInput;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });

    if (existingUser) {
      res.status(409).json({ message: "Email is already registered" });
      return;
    }

    const existingSlug = await prisma.company.findUnique({
      where: { slug: body.companySlug },
    });

    if (existingSlug) {
      res.status(409).json({ message: "Company slug is already taken" });
      return;
    }

    const passwordHash = await hashPassword(body.password);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: body.companyName,
          slug: body.companySlug,
          status: "pending",
          createdBy: null,
        },
      });

      const user = await tx.user.create({
        data: {
          email: body.email.toLowerCase(),
          name: body.name,
          passwordHash,
          role: "company_admin",
          companyId: company.id,
          status: "active",
        },
      });

      return { company, user };
    });

    const tokens = await createSessionTokens(result.user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.status(201).json({
      company: {
        id: result.company.id,
        name: result.company.name,
        slug: result.company.slug,
        status: result.company.status,
      },
      user: publicUser(result.user),
    });
  } catch (error) {
    console.error("Signup failed:", error);
    res.status(500).json({ message: "Failed to complete signup" });
  }
};

export const login: RequestHandler = async (req, res) => {
  const body = req.body as LoginInput;

  try {
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });

    if (!user || user.status !== "active") {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const valid = await verifyPassword(user.passwordHash, body.password);
    if (!valid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const tokens = await createSessionTokens(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({ user: publicUser(user) });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ message: "Failed to login" });
  }
};

export const refresh: RequestHandler = async (req, res) => {
  try {
    const refreshToken = readRefreshToken(req);

    if (!refreshToken) {
      res.status(401).json({ message: "Refresh token required" });
      return;
    }

    const rotated = await rotateSession(refreshToken);

    if (!rotated) {
      clearAuthCookies(res);
      res.status(401).json({ message: "Invalid or expired refresh token" });
      return;
    }

    setAuthCookies(res, rotated.accessToken, rotated.refreshToken);
    res.json({ user: publicUser(rotated.user) });
  } catch (error) {
    console.error("Token refresh failed:", error);
    res.status(500).json({ message: "Failed to refresh session" });
  }
};

export const logout: RequestHandler = async (req, res) => {
  try {
    await revokeRefreshToken(readRefreshToken(req));
    clearAuthCookies(res);
    res.status(204).send();
  } catch (error) {
    console.error("Logout failed:", error);
    res.status(500).json({ message: "Failed to logout" });
  }
};

export const me: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        status: true,
      },
    });

    if (!user || user.status !== "active") {
      res.status(401).json({ message: "User not found or inactive" });
      return;
    }

    res.json({ user: publicUser(user) });
  } catch (error) {
    console.error("Failed to load current user:", error);
    res.status(500).json({ message: "Failed to load current user" });
  }
};

export const googleAuth: RequestHandler = async (req, res) => {
  const authUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile']
  });
  res.redirect(authUrl);
}
export const googleCallback: RequestHandler = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        message: "Missing authorization code",
      });
    }

    const { tokens } = await googleClient.getToken(code);

    googleClient.setCredentials(tokens);

    // 3. Make sure Google gave us an ID token
    if (!tokens.id_token) {
      return res.status(400).json({
        message: "Google ID token missing",
      });
    }

    // 4. Verify the ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // 5. Get Google user's information
    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(400).json({
        message: "Could not get Google user information",
      });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    if (!googleId || !email) {
      return res.status(400).json({
        message: "Google account information incomplete",
      });
    }


    // 5. Find user by Google ID
    let user = await prisma.user.findUnique({
      where: {
        googleId,
      },
    });

    // 6. If Google account doesn't exist,
    //    check whether email already exists
    if (!user) {
      user = await prisma.user.findUnique({
        where: {
          email,
        },
      });
    }

    // 7. If user doesn't exist at all,
    //    create a new user
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name ?? "",
          googleId,
          passwordHash: "",
          // Use the values that match your application
          role: "company_admin",
          status: "active",
          // Google signup doesn't have a company yet
          companyId: "a77e4cbf-6bee-4028-b2e8-4b404c27eb9f",
        },
      });
    }

    // 8. Existing account without Google
    //    connect Google to that account
    else if (!user.googleId) {
      user = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          googleId,
          name: name ?? user.name,
        },
      });
    }

    // 9. Create YOUR application's session
    const sessionTokens = await createSessionTokens(user);

    // 10. Use YOUR existing cookie system
    setAuthCookies(
      res,
      sessionTokens.accessToken,
      sessionTokens.refreshToken
    );

    // 11. Return user
    // res.status(200).json({
    //   user: publicUser(user),
    // });

    return res.redirect(
      `${process.env.FRONTEND_URL}/`
    );
    // Continue below...
  } catch (error) {
    console.error("Google OAuth error:", error);

    return res.status(500).json({
      message: "Google authentication failed",
    });
  }
}