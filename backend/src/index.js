import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/client.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
