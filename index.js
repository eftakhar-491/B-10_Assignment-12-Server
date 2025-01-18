require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

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
  const token = req?.headers?.authorization?.split(" ")[1];
  const userEmail = req?.query?.email;
  console.log(userEmail, token);

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
    const applyedScholarship = db.collection("applyedScholarship");
    const reviews = db.collection("reviews");
    // verify role
    async function verifyAdminRole(req, res, next) {
      const email = req.query.email;
      const user = await users.findOne({ email: email });

      if (user && user.role === "Admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden" });
      }
    }
    async function verifyModaretorRole(req, res, next) {
      const email = req.query.email;
      const user = await users.findOne({ email: email });

      if (user && user.role === "Moderator") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden" });
      }
    }

    // jwt token
    app.post("/jwt", async (req, res) => {
      const data = req.body;

      const token = jwt.sign(data, process.env.JWT_SECRET, {
        expiresIn: "365d",
      });

      res.send({ token });
      // .cookie("token", token, {
      //   httpOnly: true,
      //   secure: process.env.NODE_ENV === "production",
      //   sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      // })
      // .send({ success: true });
    });
    // logout for unauthorized user
    // app.post("/logout", (req, res) => {
    //   res
    //     .clearCookie("token", {
    //       httpOnly: true,
    //       secure: process.env.NODE_ENV === "production",
    //       sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    //     })
    //     .send({ success: true });
    // });
    // users
    app.post("/users", async (req, res) => {
      const data = req.body;
      const user = await users.findOne({ email: data.email });
      if (!user) {
        const result = await users.insertOne(data);

        return res.send(result);
      }

      res.send({ success: true });
    });
    app.put("/users", async (req, res) => {
      const data = req.body;
      const result = await users.updateOne(
        { email: data.email },
        { $set: data },
        { upsert: true }
      );
      res.send(result);
    });
    app.get("/users/:email", authenticateToken, async (req, res) => {
      const email = req.params.email;
      const result = await users.findOne({ email: email });
      console.log(result);
      res.send(result);
    });
    // scholarships
    app.get("/scholarship/topScholarship", async (req, res) => {
      const result = await scholarships
        .find({})
        .sort({
          applicationFees: 1, // Sort by lowest application fees first
          scholarshipPostDate: -1,
        })
        .limit(8)
        .toArray();

      res.send(result);
    });
    app.get("/scholarship", async (req, res) => {
      const page = parseInt(req.query.page);
      const limit = 3;
      const skip = (page - 1) * limit;
      const search = req.query.search;
      console.log(page, req.query);
      const quary = search
        ? {
            $or: [
              { scholarshipName: { $regex: search, $options: "i" } },
              { universityName: { $regex: search, $options: "i" } },
              { degree: { $regex: search, $options: "i" } },
            ],
          }
        : {};
      const result = await scholarships
        .find(quary)
        .skip(skip)
        .limit(limit)
        .toArray();
      res.send(result);
    });
    app.get(
      "/scholarship/manage",
      authenticateToken,
      verifyModaretorRole,
      async (req, res) => {
        const result = await scholarships.find({}).toArray();
        res.send(result);
      }
    );
    app.patch(
      "/scholarship/:id",
      authenticateToken,
      verifyModaretorRole,
      async (req, res) => {
        const data = req.body;
        const id = req.params.id;
        const result = await scholarships.updateOne(
          { _id: new ObjectId(id) },
          { $set: data }
        );
        res.send(result);
      }
    );
    app.post("/scholarships", async (req, res) => {
      const data = req.body;
      const result = await scholarships.insertOne(data);
      res.send(result);
    });
    app.get("/scholarship/details/:id", authenticateToken, async (req, res) => {
      const id = req.params.id;

      const result = await scholarships.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });
    app.delete(
      "/scholarship/:id",
      authenticateToken,
      verifyModaretorRole,
      async (req, res) => {
        const id = req.params.id;
        const result = await scholarships.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      }
    );
    // applyed data
    app.post("/applyed", async (req, res) => {
      const data = req.body;

      const resx = await applyedScholarship.findOne({
        scholarshipId: data.scholarshipId,
      });
      if (resx?._id) {
        return res.send({ message: "Already applied" });
      }

      const result = await applyedScholarship.insertOne(data);

      res.send(result);
    });
    app.put("/applyed", async (req, res) => {
      const data = req.body;
      const result = await applyedScholarship.updateOne(
        { email: data.email, scholarshipId: data.scholarshipId },
        { $set: data },
        { upsert: true }
      );
      res.send(result);
    });
    app.patch("/applyed/:id", authenticateToken, async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const result = await applyedScholarship.updateOne(
        { _id: new ObjectId(id) },
        { $set: data }
      );
      res.send(result);
    });
    app.patch(
      "/applyed/status/:id",
      authenticateToken,
      verifyModaretorRole,
      async (req, res) => {
        const data = req.body;
        const id = req.params.id;
        const result = await applyedScholarship.updateOne(
          { _id: new ObjectId(id) },
          { $set: data }
        );
        res.send(result);
      }
    );
    app.get("/applyed/:email", authenticateToken, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const result = await applyedScholarship
        .aggregate([
          {
            $match: { email: email },
          },
          {
            $addFields: {
              scholarshipIdObjectId: { $toObjectId: "$scholarshipId" }, // Convert scholarshipId to ObjectId
            },
          },
          {
            $lookup: {
              from: "scholarships",
              localField: "scholarshipIdObjectId",
              foreignField: "_id",
              as: "scholarshipDetails",
            },
          },
        ])
        .toArray();

      res.send(result);
    });
    app.get(
      "/applyed",
      authenticateToken,
      verifyModaretorRole,
      async (_, res) => {
        const result = await applyedScholarship
          .aggregate([
            {
              $addFields: {
                scholarshipIdObjectId: { $toObjectId: "$scholarshipId" }, // Convert scholarshipId to ObjectId
              },
            },
            {
              $lookup: {
                from: "scholarships",
                localField: "scholarshipIdObjectId",
                foreignField: "_id",
                as: "scholarshipDetails",
              },
            },
          ])
          .toArray();

        res.send(result);
      }
    );

    app.delete("/applyed/:id", authenticateToken, async (req, res) => {
      const id = req.params.id;
      const result = await applyedScholarship.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });
    // app.delete(
    //   "/applyed/all/:id",
    //   authenticateToken,
    //   verifyModaretorRole,
    //   async (req, res) => {
    //     const id = req.params.id;
    //     const result = await applyedScholarship.deleteOne({
    //       _id: new ObjectId(id),
    //     });
    //     res.send(result);
    //   }
    // );
    // stripe payment
    app.post("/create-payment-intent", async (req, res) => {
      const { id } = req.body;
      const result = await scholarships.findOne({
        _id: new ObjectId(id),
      });

      const amount = parseInt(Number(result.applicationFees) * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // reviews
    app.post("/reviews", authenticateToken, async (req, res) => {
      const data = req.body;
      const result = await reviews.insertOne(data);
      const { rating, totalReview } = await scholarships.findOne({
        _id: new ObjectId(data.scholarshipId),
      });
      console.log(rating, totalReview);
      const updateResult = await scholarships.updateOne(
        { _id: new ObjectId(data.scholarshipId) },
        {
          $set: { rating: (rating + data.rating) / (totalReview + 1) },
          $inc: { totalReview: 1 },
        }
      );
      res.send({ ...result, ...updateResult });
    });
    app.get("/reviews", authenticateToken, async (req, res) => {
      const email = req.query.email;
      const result = await reviews
        .aggregate([
          {
            $match: { email: email },
          },
          {
            $addFields: {
              scholarshipIdObjectId: { $toObjectId: "$scholarshipId" }, // Convert scholarshipId to ObjectId
            },
          },
          {
            $lookup: {
              from: "scholarships",
              localField: "scholarshipIdObjectId",
              foreignField: "_id",
              as: "scholarshipDetails",
            },
          },
        ])
        .toArray();
      res.send(result);
    });
    app.get(
      "/reviews/all",
      authenticateToken,
      verifyModaretorRole,
      async (_, res) => {
        const result = await reviews
          .aggregate([
            {
              $addFields: {
                scholarshipIdObjectId: { $toObjectId: "$scholarshipId" }, // Convert scholarshipId to ObjectId
              },
            },
            {
              $lookup: {
                from: "scholarships",
                localField: "scholarshipIdObjectId",
                foreignField: "_id",
                as: "scholarshipDetails",
              },
            },
          ])
          .toArray();
        res.send(result);
      }
    );
    app.get(
      "/reviews/details/:id",
      authenticateToken,

      async (req, res) => {
        const id = req.params.id;
        const result = await reviews
          .aggregate([
            {
              $match: {
                scholarshipId: id,
              },
            },
            {
              $addFields: {
                scholarshipIdObjectId: { $toObjectId: "$scholarshipId" }, // Convert scholarshipId to ObjectId
              },
            },
            {
              $lookup: {
                from: "scholarships",
                localField: "scholarshipIdObjectId",
                foreignField: "_id",
                as: "scholarshipDetails",
              },
            },
          ])
          .toArray();
        res.send(result);
      }
    );
    app.delete("/reviews/:id", authenticateToken, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const result = await reviews.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });
    app.patch("/reviews/:id", authenticateToken, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const result = await reviews.updateOne(
        { _id: new ObjectId(id) },
        { $set: data }
      );
      res.send(result);
    });
    // Ping MongoDB to ensure a successful connection

    const res = await client.db("admin").command({ ping: 1 });
    console.log(res);
  } catch (e) {
    console.log(e);
  } finally {
  }
}
run().catch();

app.listen(port, () => {});
