const { PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const mime = require("mime-types");
const { s3Client, BUCKET_NAME } = require("./config/aws-config");


// Helper function to create response
function createResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...headers
    },
    body: JSON.stringify(body),
  };
}

// Helper function to parse JSON request body
function parseRequestBody(event) {
  try {
    let body = event.body;
    
    // If body is base64 encoded, decode it first
    if (event.isBase64Encoded) {
      body = Buffer.from(body, 'base64').toString('utf8');
    }
    
    return JSON.parse(body);
  } catch (error) {
    throw new Error('Invalid JSON in request body: ' + error.message);
  }
}

// Helper function to validate metadata
function validateMetadata(metadata) {
  const errors = [];
  
  if (!metadata.author_name || metadata.author_name.trim() === '') {
    errors.push('Author name is required');
  }
  
  if (metadata.expiration_date) {
    const expirationDate = new Date(metadata.expiration_date);
    if (isNaN(expirationDate.getTime())) {
      errors.push('Invalid expiration date format');
    } else if (expirationDate <= new Date()) {
      errors.push('Expiration date must be in the future');
    }
  }
  
  return errors;
}

async function uploadToS3(event) {
  try {
    // Check Content-Type header for JSON
    const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'];
    if (!contentType || !contentType.includes('application/json')) {
      return createResponse(400, { 
        error: "Content-Type must be application/json" 
      });
    }

    // Parse JSON request body
    const requestData = parseRequestBody(event);
    
    // Extract file and metadata from JSON
    const { file_data, file_name, file_type, metadata } = requestData;

    // Validate required fields
    if (!file_data || !file_name) {
      return createResponse(400, { error: "file_data and file_name are required" });
    }

    // Validate metadata
    const validationErrors = validateMetadata(metadata || {});
    if (validationErrors.length > 0) {
      return createResponse(400, { error: validationErrors.join(', ') });
    }

    // Generate unique file ID
    const fileId = crypto.randomUUID();
    
    // Get file info
    const originalFileName = file_name;
    const fileExtension = originalFileName.split('.').pop() || '';
    const mimeType = file_type || mime.lookup(originalFileName) || 'application/octet-stream';
    
    
    // Convert base64 file data to buffer
    let fileBuffer;
    try {
      // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
      const base64Data = file_data.replace(/^data:[^;]+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      return createResponse(400, { error: "Invalid base64 file data" });
    }
    
    // Upload file to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${fileId}.${fileExtension}`,
        Body: fileBuffer,
        ContentType: mimeType,
        Metadata: {
          original_filename: originalFileName,
          file_id: fileId,
          author_name: metadata?.author_name || '',
          file_extension: fileExtension,
          upload_date: new Date().toISOString()
        }
      })
    );

    return createResponse(200, { 
      file_id: fileId,
      message: "File uploaded successfully"
    });

  } catch (error) {
    console.error("Upload error:", error);
    
    return createResponse(500, { 
      error: "Failed to upload file",
      details: error.message 
    });
  }
}

module.exports = { uploadToS3 };

