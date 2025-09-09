const { processS3Upload } = require("./metadata_extraction.js");

exports.handler = async (event) => {
  console.log('S3 Trigger Lambda invoked with event:', JSON.stringify(event, null, 2));
  
  try {
    const result = await processS3Upload(event);
    
    // If processing failed, throw an exception to trigger retry and eventually DLQ
    if (result === false) {
      console.error('S3 upload processing failed, throwing exception for retry/DLQ');
      throw new Error('S3 upload processing failed - event will be retried and sent to DLQ if all retries fail');
    }
    
    console.log('S3 upload processing completed successfully');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'S3 upload processed successfully' })
    };
    
  } catch (error) {
    console.error('S3 Trigger Lambda error:', error);
    // Re-throw the error to allow Lambda to retry and eventually send to DLQ
    throw error;
  }
};
