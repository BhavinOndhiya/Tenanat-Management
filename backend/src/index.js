// Load environment variables FIRST, before any other imports
import dotenv from "dotenv";
dotenv.config();

// Now import other modules (they may read process.env)
import app from "./app.js";
import connectDB from "./db/client.js";

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
