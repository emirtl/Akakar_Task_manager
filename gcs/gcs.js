const { Storage } = require("@google-cloud/storage");

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const keyFilename = process.env.GOOGLE_CLOUD_KEYFILE_PATH;

const storage = new Storage({
  projectId,
  keyFilename,
});

module.exports = storage;
