const required = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];

export function validateServerEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export function getPublicAppConfig() {
  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME || "Smart Retail ERP & POS System",
    currency: process.env.NEXT_PUBLIC_CURRENCY || "PKR",
  };
}
