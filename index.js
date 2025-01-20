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
      "https://scholar-sphere-system.web.app",
      "scholar-sphere-system.firebaseapp.com",
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
  console.log(userEmail);

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

      if ((user && user.role === "Moderator") || user.role === "Admin") {
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
    });

    // users
    app.post("/users", async (req, res) => {
      const data = req.body;
      const user = await users.findOne({ email: data.email });
      if (!user) {
        const result = await users.insertOne(data);

        return res.send(result);
      }

      res.send({ ...user });
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

      res.send(result);
    });
    app.get(
      "/users/all/admin",
      authenticateToken,
      verifyAdminRole,
      async (req, res) => {
        const quary =
          req.query.filter === "All" ? {} : { role: req.query.filter };
        const result = await users.find(quary).toArray();

        res.send(result);
      }
    );
    app.patch(
      "/users/admin/role/:email",
      authenticateToken,
      verifyAdminRole,
      async (req, res) => {
        const email = req.params.email;
        const data = req.body;
        const result = await users.updateOne({ email: email }, { $set: data });
        res.send(result);
      }
    );
    app.delete(
      "/users/admin/delete/:email",
      authenticateToken,
      verifyAdminRole,
      async (req, res) => {
        const email = req.params.email;
        const result = await users.deleteOne({ email: email });
        res.send(result);
      }
    );

    // scholarships
    app.get(
      "/scholarship/chart",
      authenticateToken,
      verifyAdminRole,
      async (req, res) => {
        const scholarRes = await scholarships.find({}).toArray();

        const applyedRes = await applyedScholarship.find({}).toArray();
        const result = scholarRes.map((item) => {
          const total = applyedRes.map(
            (applyedItem) => item._id.toString() === applyedItem.scholarshipId
          );

          return {
            totalReview: item.totalReview,
            totalApplyed: total.length,
            scholarshipName: item.scholarshipName,
            Fees: item.applicationFees,
          };
        });
        res.send(result);
      }
    );
    app.get("/scholarship/topScholarship", async (req, res) => {
      const result = await scholarships
        .find({})
        .sort({
          applicationFees: 1,
          scholarshipPostDate: -1,
        })
        .limit(6)
        .toArray();

      res.send(result);
    });
    app.get("/scholarship", async (req, res) => {
      const page = parseInt(req.query.page);
      const limit = 8;
      const skip = (page - 1) * limit;
      const search = req.query.search;

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
    app.post(
      "/scholarships",
      authenticateToken,
      verifyModaretorRole,
      async (req, res) => {
        const data = req.body;
        const result = await scholarships.insertOne(data);
        res.send(result);
      }
    );
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
    app.post("/applyed", authenticateToken, async (req, res) => {
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
    app.put("/applyed", authenticateToken, async (req, res) => {
      const data = req.body;
      const result = await applyedScholarship.updateOne(
        { email: data.email, scholarshipId: data.scholarshipId },
        { $set: data },
        { upsert: true }
      );
      res.send(result);
    });
    app.put("/applyed/feedback/:id", authenticateToken, async (req, res) => {
      const data = req.body;
      const result = await applyedScholarship.updateOne(
        { _id: new ObjectId(req.params.id) },
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
    app.get(
      "/applyed/:email",
      authenticateToken,

      async (req, res) => {
        const email = req.params.email;

        const result = await applyedScholarship
          .aggregate([
            {
              $match: { email: email },
            },
            {
              $addFields: {
                scholarshipIdObjectId: { $toObjectId: "$scholarshipId" },
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
      "/applyed/allApply/add",
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

    // stripe payment
    app.post("/create-payment-intent", authenticateToken, async (req, res) => {
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

      const review = await reviews.findOne({ _id: new ObjectId(id) });
      const { rating, totalReview } = await scholarships.findOne({
        _id: new ObjectId(review.scholarshipId),
      });
      const result = await reviews.deleteOne({ _id: new ObjectId(id) });
      const calculate =
        (rating * totalReview - review.rating) / (totalReview - 1) || 0;
      console.log(calculate, rating, totalReview);
      const updateRating = await scholarships.updateOne(
        {
          _id: new ObjectId(review.scholarshipId),
        },
        {
          $set: { rating: calculate },
          $inc: { totalReview: -1 },
        }
      );
      console.log("total-->", totalReview);
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
    app.get("/", (_, res) => {
      res.send({ success: true });
    });
    const res = await client.db("admin").command({ ping: 1 });
    console.log(res);
  } catch (e) {
    // error handel
  }
}
run().catch();

app.listen(port, () => {});
