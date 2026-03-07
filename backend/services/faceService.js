const FormData = require('form-data');
let fetchImpl;

const ensureFetch = async () => {
  if (fetchImpl) {
    return fetchImpl;
  }
  const { default: fetchFn } = await import('node-fetch');
  fetchImpl = fetchFn;
  return fetchImpl;
};

class FaceServiceError extends Error {
  constructor(message, status, statusText, body) {
    super(message);
    this.name = 'FaceServiceError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

const callFaceApi = async (endpoint, formData) => {
  const fetch = await ensureFetch();

  const response = await fetch(`${process.env.FACE_SERVICE_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
    headers: formData.getHeaders()
  });

  if (!response.ok) {
    const rawText = await response.text();
    let errorBody = {};
    try {
      errorBody = rawText ? JSON.parse(rawText) : {};
    } catch {
      errorBody = {};
    }
    console.error('Face service error', {
      endpoint,
      status: response.status,
      statusText: response.statusText,
      body: rawText
    });
    const detail =
      errorBody.detail ||
      errorBody.message ||
      rawText ||
      `Face service request failed (${response.status} ${response.statusText})`;
    throw new FaceServiceError(detail, response.status, response.statusText, rawText);
  }

  return response.json();
};

const registerFace = async (userId, imageBuffer) => {
  const form = new FormData();
  form.append('user_id', userId);
  form.append('image', imageBuffer, {
    filename: `${userId}.jpg`,
    contentType: 'image/jpeg'
  });

  return callFaceApi('/api/face/register', form);
};

const verifyFace = async (userId, imageBuffer) => {
  const form = new FormData();
  form.append('user_id', userId);
  form.append('image', imageBuffer, {
    filename: `${userId}.jpg`,
    contentType: 'image/jpeg'
  });

  return callFaceApi('/api/face/verify', form);
};

module.exports = {
  registerFace,
  verifyFace
};
