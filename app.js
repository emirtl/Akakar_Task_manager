const mongoose = require("mongoose");
const express = require("express");
const helmet = require("helmet");
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const app = express();

//middlewares

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use("/public/uploads", express.static(path.join("public/uploads")));
app.use((req, res, next) => {
  res.send("hello akakar");
});

async function main() {
  await mongoose.connect(
    `mongodb+srv://${process.env.MONGOOSE_USER}:${process.env.MONGOOSE_PASSWORD}@master.xebze3l.mongodb.net/${process.env.MONGOOSE_DATABSE_NAME}`
  );
}

main()
  .then(() => console.log("connected to mongoose"))
  .catch((err) => console.log(err));

//routes
const userRoutes = require("./routes/user");
const taskRoutes = require("./routes/task");

app.use(`${process.env.API}/users`, userRoutes);
app.use(`${process.env.API}/tasks`, taskRoutes);

const PORT = process.env.PORT || 9000;

app.listen(process.env.PORT, () => {
  console.log(`connected to port ${PORT}`);
});
