const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client, docClient, TABLE_NAME } = require("./config/aws-config");


async function extractFileMetadata(fileBuffer, fileName, mimeType, s3Metadata = {}) {
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const metadata = {
    file_type: mimeType,
    file_size: fileBuffer.length,
    file_extension: fileExtension,
    number_of_pages: null,
    image_dimensions: null,
    text_content_length: null,
    creation_date: null,
    last_modified: null,
    // Include S3 object metadata
    s3_metadata: s3Metadata,
    original_filename: s3Metadata.original_filename,
    author_name: s3Metadata.author_name || null,
    upload_date: s3Metadata.upload_date || null
  };

  try {
    // PDF-specific metadata extraction
    if (mimeType === 'application/pdf' || fileExtension === 'pdf') {
      metadata.number_of_pages = await extractPDFPages(fileBuffer);
    }

    // Image-specific metadata extraction
    if (mimeType.startsWith('image/')) {
      metadata.image_dimensions = await extractImageDimensions(fileBuffer);
    }

    // Text file content analysis
    if (mimeType.startsWith('text/') || fileExtension === 'txt') {
      const textContent = fileBuffer.toString('utf8');
      metadata.text_content_length = textContent.length;
      metadata.word_count = textContent.split(/\s+/).filter(word => word.length > 0).length;
    }

    // Office document analysis (basic)
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExtension)) {
      metadata.document_type = 'office_document';
    }

    // Archive file analysis
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExtension)) {
      metadata.archive_type = fileExtension;
    }

  } catch (error) {
    console.error('Error extracting metadata:', error);
  }

  return metadata;
}

// Helper function to extract PDF page count
async function extractPDFPages(fileBuffer) {
  try {
    // Simple PDF page count extraction by counting "%%EOF" markers
    const pdfContent = fileBuffer.toString('binary');
    const pageMatches = pdfContent.match(/%%EOF/g);
    return pageMatches ? pageMatches.length : null;
  } catch (error) {
    console.error('Error extracting PDF pages:', error);
    return null;
  }
}

async function extractImageDimensions(fileBuffer) {
  try {
    // For JPEG images, extract dimensions from header
    if (fileBuffer[0] === 0xFF && fileBuffer[1] === 0xD8) {
      // JPEG format
      let i = 2;
      while (i < fileBuffer.length - 1) {
        if (fileBuffer[i] === 0xFF && fileBuffer[i + 1] === 0xC0) {
          const height = (fileBuffer[i + 5] << 8) | fileBuffer[i + 6];
          const width = (fileBuffer[i + 7] << 8) | fileBuffer[i + 8];
          return { width, height };
        }
        i++;
      }
    }
    
    // For PNG images
    if (fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x4E && fileBuffer[3] === 0x47) {
      const width = (fileBuffer[16] << 24) | (fileBuffer[17] << 16) | (fileBuffer[18] << 8) | fileBuffer[19];
      const height = (fileBuffer[20] << 24) | (fileBuffer[21] << 16) | (fileBuffer[22] << 8) | fileBuffer[23];
      return { width, height };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting image dimensions:', error);
    return null;
  }
}


async function processS3Upload(event) {
  try {
    console.log('Processing S3 upload event:', JSON.stringify(event, null, 2));

    // Process each record in the event
    for (const record of event.Records) {
      
      const bucketName = record.s3.bucket.name;
      const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      
      console.log(`Processing file: ${objectKey} from bucket: ${bucketName}`);

      // Extract file ID and file name from the object key
      const fileName = objectKey.split('/').pop();
      const fileId = fileName.split('.')[0];
      
      // Get file from S3
      const getObjectResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: objectKey
        })
      );

      // Read file content
      const fileBuffer = await streamToBuffer(getObjectResponse.Body);
      
      // Get content type from S3 metadata or infer from file extension
      const contentType = getObjectResponse.ContentType || 'application/octet-stream';
      
      // Get S3 object metadata (user-defined metadata)
      const s3Metadata = getObjectResponse.Metadata || {};
      
      // Extract additional metadata including S3 metadata
      const extractedMetadata = await extractFileMetadata(fileBuffer, fileName, contentType, s3Metadata);
      
      // Prepare metadata for DynamoDB
      const dbMetadata = {
        file_id: fileId,
        s3_object_key: objectKey,
        s3_bucket: bucketName,
        extracted_at: new Date().toISOString(),
        status: 'active',
        ...extractedMetadata
      };

      // Store extracted metadata in DynamoDB
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: dbMetadata
        })
      );

      console.log(`Successfully processed and stored metadata for file: ${fileId}`);
    
    }

    return true

  } catch (error) {
    console.error('Error processing S3 upload:', error);
    return false;
  }
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = { processS3Upload };
