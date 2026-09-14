import type { NextConfig } from "next";

// Frontend gọi /api cùng domain nên không cần header CORS.
// Nếu sau này có domain khác (vd: aeck.edu.vn) gọi API, hãy thêm đúng domain đó thay vì dùng "*".
const nextConfig: NextConfig = {};

export default nextConfig;
