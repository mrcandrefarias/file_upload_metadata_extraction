// Centralized AWS configuration for all Lambda functions
const { S3Client } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

// AWS configuration object
const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.LOCALSTACK_ENDPOINT || 'http://host.docker.internal:4566',
  forcePathStyle: true,
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  }
};

// Pre-configured AWS clients
const s3Client = new S3Client(awsConfig);
const dynamoClient = new DynamoDBClient(awsConfig);
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Environment variables
const BUCKET_NAME = process.env.BUCKET_NAME || 'my-file-uploads';
const TABLE_NAME = process.env.TABLE_NAME || 'FileMetadata';

module.exports = {
  awsConfig,
  s3Client,
  dynamoClient,
  docClient,
  BUCKET_NAME,
  TABLE_NAME
};
