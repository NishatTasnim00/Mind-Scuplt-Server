const cors = require("cors");
const express = require("express");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

//middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oeh6vj2.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const usersCollection = client.db("mindSculpt").collection("users");
    const courseCollection = client.db("mindSculpt").collection("courses");
    const reviewCollection = client.db("mindSculpt").collection("reviews");

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // current user data
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.patch("/enroll", async (req, res) => {
      const { courseId, email } = req.query;
      const CourseId = new ObjectId(courseId);
      const query = { _id: CourseId };
      const filter = { email: email };
      console.log(courseId, email);

      const user = await usersCollection.findOne(filter);
      const course = await courseCollection.findOne(query);
      console.log(course);
      console.log(user);
      if (user) {
        if (!user.enrolledCourses) {
          user.enrolledCourses = [courseId];
          if (!course?.enrolledStudent) {
            course.enrolledStudent = [email];
          } else {
            course?.enrolledStudent.push(email);
          }
        } else {
          if (user?.enrolledCourses.includes(courseId)) {
            return res.send({ error: true, message: "Already enrolled!" });
          } else {
            user.enrolledCourses.push(courseId);
            if (!course?.enrolledStudent) {
              course.enrolledStudent = [email];
            } else {
              user?.enrolledStudent.push(email);
            }
          }
        }
        // Update the user in the database
        const updateUser = { $set: user };
        const updateCourse = { $set: course };
        const result =
          (await usersCollection.updateOne(filter, updateUser)) &&
          (await courseCollection.updateOne(query, updateCourse));

        return res.send(result);
      } else {
        return res.send({ message: "User not found" });
      }
    });

    app.get("/courses", async (req, res) => {
      const result = await courseCollection.find().toArray();
      res.send(result);
    });

    app.get("/course/:id", async (req, res) => {
      const id = req.params.id;
      const CourseId = new ObjectId(id);
      const query = { _id: CourseId };

      const course = await courseCollection.findOne(query);
      

      const result = await usersCollection.find({ email: { $in: course?.enrolledStudent } }).toArray();
      res.send([course, result]);
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/myCourses/:email", async (req, res) => {
      const query = { email: req.query.email };
      const result = await courseCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // search
    app.get("/courses/search/:searchText", async (req, res) => {
      const searchText = req.params.searchText;
      const minRating = parseFloat(req.params.searchText) || 0;
      const result = await courseCollection
        .find({
          $or: [
            { courseName: { $regex: searchText, $options: "i" } },
            { "instructor.name": { $regex: searchText, $options: "i" } },
            { rating: { $gte: minRating, $regex: searchText } },
          ],
        })
        .toArray();

      res.send(result);
    });

    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("mind sculpt is running ");
});

app.listen(port, () => {
  console.log("mind sculpt is running at port: ", port);
});
