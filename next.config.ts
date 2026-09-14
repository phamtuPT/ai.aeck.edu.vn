import type { NextConfig } from "next";

// Frontend gọi /api cùng domain nên không cần header CORS.
// Nếu sau này có domain khác (vd: aeck.edu.vn) gọi API, hãy thêm đúng domain đó thay vì dùng "*".
const nextConfig: NextConfig = {
  // Thư viện đọc PDF dùng binary native (@napi-rs/canvas) và worker của pdfjs:
  // không bundle, để Node nạp trực tiếp trên serverless.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
