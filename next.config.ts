import type { NextConfig } from "next";

/**
 * The billing backend is reached via Route Handlers (`/api/billing-backend`, `/api/billing-api`, `/sanctum/csrf-cookie`)
 * so TLS options (`API_TLS_INSECURE`, `getBillingBackendHttpsAgent`) apply in one place.
 */
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
