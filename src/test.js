import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config()

console.log("REFRESH_TOKEN_SECRET:", process.env.REFRESH_TOKEN_SECRET);
const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfd2QiOiIxMjM0NTY3ODkiLCJ1c2VybmFtZSI6InRlc3RVc2VyIiwiaWF0IjoxNjgyMzYyMDAwfQ.4JItI_WcZGpncUmH1K4GhrzCTIDzRvqpHZAVO2adPcU"; // Replace this with your actual token

try {
    const decoded = jwt.verify(testToken, process.env.REFRESH_TOKEN_SECRET);
    console.log("Decoded Token:", decoded);
} catch (error) {
    console.error("Manual JWT Verification Error:", error.message);
}
