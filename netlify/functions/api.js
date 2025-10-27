const { Handler } = require('@netlify/functions');

exports.handler = async (event, context) => {
  const path = event.path.replace('/api', '');
  
  // For now, return a simple response until we fix the backend
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify({ message: 'API endpoint hit', path })
  };
};
