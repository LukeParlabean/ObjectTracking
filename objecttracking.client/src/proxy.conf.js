const { env } = require('process');

const target = env.ASPNETCORE_HTTPS_PORT ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}` :
  env.ASPNETCORE_URLS ? env.ASPNETCORE_URLS.split(';')[0] : 'https://localhost:7282';

const PROXY_CONFIG = [
  {
    context: [
      "/VideoUpload/upload",
      "/VideoUpload/frames",
      "/VideoUpload/frame",
      "/VideoUpload/save-label",
      "/VideoUpload/train-stream",
      "/VideoUpload/get-training-zip",
      "/VideoUpload/upload-assets",
      "/VideoUpload/process-video",
      "/VideoUpload/download-processed-video"
    ],
    target,
    secure: false
  }
]

module.exports = PROXY_CONFIG;
