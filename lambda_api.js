const { uploadToS3 } = require("./upload.js");
const { getFileMetadata } = require("./get-metadata.js");

exports.handler = async (event) => {
  
    // Handle CORS preflight requests
    if (event.requestContext?.http?.method === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: "CORS preflight" }),
      };
    }
  
    // Handle upload endpoint
    if (event.requestContext?.http?.method === "POST" && event.rawPath === "/upload") {
      return await uploadToS3(event);
    }

    // Handle metadata endpoint
    if (event.requestContext?.http?.method === "GET" && event.rawPath?.startsWith("/metadata/")) {
      return await getFileMetadata(event);
    }

    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: "Not Found" }),
    };
};
