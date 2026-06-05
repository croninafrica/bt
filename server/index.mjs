import app from "./app.mjs";
import { HOST, PORT } from "./config.mjs";

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

if (!isServerless) {
  app.listen(PORT, HOST, () => {
    console.log(`磁力搜 → http://127.0.0.1:${PORT}`);
  });
}

export default app;
