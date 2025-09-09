const { uploadToS3 } = require("./upload.js");

exports.handler = async (event) => {
  
    // Handle CORS preflight requests
    if (event.requestContext?.http?.method === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: "CORS preflight" }),
      };
    }
  
    if (event.requestContext?.http?.method === "POST" || event.rawPath === "/upload") {
      return await uploadToS3(event);
    }

    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: "Not Found" }),
    };
};