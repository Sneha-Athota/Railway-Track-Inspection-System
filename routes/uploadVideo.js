const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const VIDEO_CONTAINER_NAME = "trackvideo";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  sharedKeyCredential
);

const containerClient = blobServiceClient.getContainerClient(VIDEO_CONTAINER_NAME);

const upload = multer({ dest: "uploads/" });

router.post("/upload-video", upload.single("video"), async (req, res) => {
  const { trackName } = req.body;
  const file = req.file;

  if (!trackName || !file) {
    return res.status(400).json({ error: "Track name and video file are required" });
  }

  const blobName = `${trackName}.MP4`;
  const blobClient = containerClient.getBlockBlobClient(blobName);

  try {
    const stream = fs.createReadStream(file.path);
    const uploadBlobResponse = await blobClient.uploadStream(stream, undefined, undefined, {
      blobHTTPHeaders: { blobContentType: "video/mp4" },
    });

    fs.unlinkSync(file.path); // delete temp file

    console.log(`✔ Uploaded: ${blobName}`);
    res.json({ message: `Video uploaded as "${blobName}"` });
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ error: "Failed to upload video" });
  }
});

module.exports = router;
