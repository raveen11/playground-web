import type { CookieOptions, Response } from "express";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

function baseCookieOptions(): CookieOptions {
  const isProduction = true;
  // process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: 1000 * 60 * 15,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookies(res: Response): void {
  const options = baseCookieOptions();
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
}
