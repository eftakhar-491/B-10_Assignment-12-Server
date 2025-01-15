require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://chrono-craft-art.web.app",
      "https://chrono-craft-art.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s7kzw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
function authenticateToken(req, res, next) {
  const token = req?.cookies?.token;
  const userEmail = req?.query?.email;

  if (!token) return res.status(401).send({ message: "Unauthorized" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ message: "Unauthorized" });

    if (decoded.email === userEmail) {
      next();
    } else {
      return res.status(403).send({ message: "Forbidden" });
    }
  });
}

async function run() {
  try {
    const db = client.db("scholarshipDB");
    const users = db.collection("users");
    const scholarships = db.collection("scholarships");
    // const artifactsLikes = db.collection("artifactsLikes");
    // const feedback = db.collection("feedback");
    // jwt token
    app.post("/jwt", async (req, res) => {
      const data = req.body;
      console.log(data);
      const token = jwt.sign(data, process.env.JWT_SECRET, {
        expiresIn: "365d",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    // logout for unauthorized user
    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Ping MongoDB to ensure a successful connection

    const res = await client.db("admin").command({ ping: 1 });
    console.log(res);
    app.get("/", async (req, res) => {
      res.send("Hello World");
    });
  } catch (e) {
    console.log(e);
  } finally {
  }
}
run().catch();

app.listen(port, () => {});
