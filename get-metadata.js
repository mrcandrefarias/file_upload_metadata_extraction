const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

// AWS Clients configuration
const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.LOCALSTACK_ENDPOINT || 'http://host.docker.internal:4566',
  forcePathStyle: true,
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  }
};

const dynamoClient = new DynamoDBClient(awsConfig);
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME;

// Helper function to create response
function createResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...headers
    },
    body: JSON.stringify(body),
  };
}

async function getFileMetadata(event) {
  try {
    // Extract file_id from path parameters
    const fileId = event.pathParameters?.file_id;
    
    if (!fileId) {
      return createResponse(400, { 
        error: "file_id is required in the URL path" 
      });
    }

    // Validate file_id format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileId)) {
      return createResponse(400, { 
        error: "Invalid file_id format. Must be a valid UUID." 
      });
    }

    // Query DynamoDB for the file metadata
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          file_id: fileId
        }
      })
    );

    // Check if file exists
    if (!result.Item) {
      return createResponse(404, { 
        error: "File not found",
        file_id: fileId
      });
    }

    // Check if file is active (not deleted/expired)
    if (result.Item.status !== 'active') {
      return createResponse(410, { 
        error: "File is no longer available",
        file_id: fileId,
        status: result.Item.status
      });
    }

    // Check if file has expired
    if (result.Item.expiration_date) {
      const expirationDate = new Date(result.Item.expiration_date);
      const now = new Date();
      
      if (expirationDate <= now) {
        return createResponse(410, { 
          error: "File has expired",
          file_id: fileId,
          expiration_date: result.Item.expiration_date
        });
      }
    }

    // Return the metadata (exclude internal fields)
    const metadata = {
      file_id: result.Item.file_id,
      original_filename: result.Item.original_filename,
      file_size: result.Item.file_size,
      mime_type: result.Item.mime_type,
      author_name: result.Item.author_name,
      description: result.Item.description,
      category: result.Item.category,
      tags: result.Item.tags,
      expiration_date: result.Item.expiration_date,
      upload_date: result.Item.upload_date,
      status: result.Item.status
    };

    return createResponse(200, {
      message: "File metadata retrieved successfully",
      metadata: metadata
    });

  } catch (error) {
    console.error("Get metadata error:", error);
    
    return createResponse(500, { 
      error: "Failed to retrieve file metadata",
      details: error.message 
    });
  }
}

module.exports = { getFileMetadata };
