import { app } from "./app.js";
import { config } from "./config.js";
import { connectDb } from "./db.js";
import { seedIfEmpty } from "./seed.js";

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set. Using the development default.");
}

await connectDb();
await seedIfEmpty();

app.listen(config.port, () => {
  console.log(`LMS API listening on http://localhost:${config.port}`);
});
