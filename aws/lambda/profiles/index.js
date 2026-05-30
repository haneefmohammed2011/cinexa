const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.TABLE_NAME;

exports.handler = async (event) => {
  console.log('event', JSON.stringify(event));
  const method = event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method);
  const userId = event.pathParameters && event.pathParameters.userId;

  if (!userId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };

  try {
    if (method === 'GET') {
      const res = await db.query({ TableName: TABLE, KeyConditionExpression: 'userId = :u', ExpressionAttributeValues: { ':u': userId } }).promise();
      return { statusCode: 200, body: JSON.stringify({ profiles: res.Items || [] }) };
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.name) return { statusCode: 400, body: JSON.stringify({ error: 'name required' }) };
      const profileId = Date.now().toString();
      const item = { userId, profileId, name: body.name, icon: body.icon || 'default', isKids: !!body.isKids, createdAt: new Date().toISOString() };
      await db.put({ TableName: TABLE, Item: item }).promise();
      return { statusCode: 201, body: JSON.stringify({ profile: item }) };
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || err }) };
  }
};
