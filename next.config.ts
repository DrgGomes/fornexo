import type { NextConfig } from "next";

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
];
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  ...baseHeaders,
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];
// a landing do fornecedor pode aparecer na previa do editor (mesmo dominio)
const showcaseHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  ...baseHeaders,
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  serverExternalPackages: ["bcryptjs"],
  // arquivos da extensao do Chrome, empacotados sob demanda em /api/extension
  outputFileTracingIncludes: { "/api/extension": ["./extension/**/*"] },
  async headers() {
    return [
      { source: "/((?!v/).*)", headers: securityHeaders },
      { source: "/v/:path*", headers: showcaseHeaders },
    ];
  },
};

export default nextConfig;
