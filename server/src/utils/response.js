// Every successful response has the same shape: { success: true, message?, data }
function sendSuccess(res, data, { status = 200, message } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  body.data = data;
  return res.status(status).json(body);
}

module.exports = { sendSuccess };
