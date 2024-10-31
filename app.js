const mongoose = require("mongoose");
const express = require("express");
const helmet = require("helmet");
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

//middlewares

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use("/public/uploads", express.static(path.join("public/uploads")));

async function main() {
  await mongoose.connect(
    `mongodb+srv://${process.env.MONGOOSE_USER}:${process.env.MONGOOSE_PASSWORD}@master.xebze3l.mongodb.net/${process.env.MONGOOSE_DATABSE_NAME}`
  );
}

main()
  .then(() => console.log("connected to mongoose"))
  .catch((err) => console.log(err));

io.on("connection", (client) => {
  client.on("event", (data) => {
    /* … */
  });
  client.on("disconnect", () => {
    /* … */
  });
});

//routes
const userRoutes = require("./routes/user");
const taskRoutes = require("./routes/task");
const elevatorRoutes = require("./routes/elevator");

app.use(`${process.env.API}/users`, userRoutes);
app.use(`${process.env.API}/tasks`, taskRoutes);
app.use(`${process.env.API}/elevator`, elevatorRoutes);

app.use((err, req, res, next) => {
  // Handle the error
  res.status(err.status || 500).json({ error: err.message });
});

const PORT = process.env.PORT || 9000;

// app.listen(process.env.PORT, () => {
//   console.log(`connected to port ${PORT}`);
// });

server.listen(process.env.PORT, () => {
  console.log(`connected to port ${PORT}`);
});
