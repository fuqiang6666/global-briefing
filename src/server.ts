import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { startScheduler } from "./lib/scheduler";

const dev = process.env.COZE_PROJECT_ENV !== "PROD";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.DEPLOY_RUN_PORT || process.env.PORT || "5000", 10);

// 禁用调度器（用于调试 / 测试）
const schedulerEnabled = process.env.DISABLE_SCHEDULER !== "1";

// 打印启动信息
console.log(`[server] Starting with COZE_PROJECT_ENV=${process.env.COZE_PROJECT_ENV}, dev=${dev}, port=${port}`);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log(`[server] Next.js app prepared`);
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });
  server.once("error", (err) => {
    console.error("[server] Server error:", err);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? "development" : process.env.COZE_PROJECT_ENV
      }`,
    );
  });

  // 启动后台调度器（每分钟检查一次，到点就触发每日简报生成 + 邮件推送）
  if (schedulerEnabled) {
    startScheduler();
  } else {
    console.log("[scheduler] DISABLE_SCHEDULER=1，调度器未启动");
  }
}).catch((err) => {
  console.error("[server] Failed to prepare Next.js app:", err);
  process.exit(1);
});
