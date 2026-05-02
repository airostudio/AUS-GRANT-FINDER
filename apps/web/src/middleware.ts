import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware
 *
 * Runs on Vercel Edge Network before requests reach API routes.
 * Implements:
 * - Security headers
 * - Rate limiting
 * - Request validation
 */

// Simple in-memory rate limiter (resets on deployment)
// For production with multiple instances, use Vercel KV or Upstash
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute per IP

function rateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    // New window
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt };
  }

  record.count++;

  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - record.count,
    resetAt: record.resetAt,
  };
}

function getIP(request: NextRequest): string {
  // Vercel provides x-real-ip and x-forwarded-for
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    '127.0.0.1'
  );
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Apply security headers to all responses
  applySecurityHeaders(response);

  // Rate limit API routes only
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = getIP(request);
    const { allowed, remaining, resetAt } = rateLimit(ip);

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.floor(resetAt / 1000)));

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
            ...Object.fromEntries(response.headers.entries()),
          },
        }
      );
    }
  }

  return response;
}

function applySecurityHeaders(response: NextResponse) {
  // Content Security Policy (CSP)
  // Restricts resource loading to prevent XSS
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline needed for Next.js
    "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind
    "img-src 'self' data: https:", // Allow images from HTTPS and data URIs
    "font-src 'self' data:",
    "connect-src 'self' https://api.tenders.gov.au https://www.grants.gov.au https://www.arc.gov.au https://data.brisbane.qld.gov.au https://data.nsw.gov.au https://www.data.qld.gov.au https://www.data.vic.gov.au https://data.sa.gov.au https://data.wa.gov.au https://data.act.gov.au https://data.nt.gov.au https://data.gov.au", // Allow API calls to government domains
    "frame-ancestors 'none'", // Prevent clickjacking
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests", // Force HTTPS
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer policy - don't leak URLs
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy - disable unnecessary browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Strict Transport Security - force HTTPS for 1 year
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Remove X-Powered-By header (security through obscurity)
  response.headers.delete('X-Powered-By');
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
