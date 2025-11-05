const express = require('express');
const router = express.Router();
const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);

router.get('/generate-sas', async (req, res) => {
  const { containerName, blobName } = req.query;

  if (!containerName || !blobName) {
    return res.status(400).json({ error: 'Missing containerName or blobName parameter' });
  }

  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    const expiresOn = new Date(new Date().valueOf() + 3600 * 1000); // 1 hour

    const sasToken = generateBlobSASQueryParameters({
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn,
    }, sharedKeyCredential).toString();

    const sasUrl = `${blobClient.url}?${sasToken}`;
    res.json({ sasUrl });
  } catch (error) {
    console.error('Error generating SAS token:', error.message);
    res.status(500).json({ error: 'Failed to generate SAS token' });
  }
});

module.exports = router;
