const path = require("path");
const fs = require("fs");

exports.removeFile = (filePath) => {
  console.log("filePath", filePath);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error removing file:", err);
    } else {
      console.log("File removed successfully!");
    }
  });
};
