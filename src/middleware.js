export { default } from "next-auth/middleware";

export const config = { matcher: [
  "/dashboard/:path*","/pos/:path*","/inventory/:path*","/vendors/:path*","/purchases/:path*","/customers/:path*","/accounting/:path*","/reports/:path*","/settings/:path*","/users/:path*","/admin/:path*",
] };
