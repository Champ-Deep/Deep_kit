import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

export interface GeminiImageResponse {
  imageUrl: string;
  prompt: string;
}

export async function generateImage(prompt: string, aspectRatio: string = '1:1'): Promise<GeminiImageResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Generate an image for: ${prompt}. Aspect ratio: ${aspectRatio}`
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Note: Gemini 2.0 Flash doesn't actually generate images directly
    // This is a placeholder for the integration structure
    // In production, you would use Imagen or another image generation service

    return {
      imageUrl: 'https://placeholder.com/generated-image.png',
      prompt
    };
  } catch (error: any) {
    console.error('Gemini API error:', error.response?.data || error.message);
    throw new Error('Failed to generate image with Gemini');
  }
}

export async function generateSocialCaption(topic: string, platform: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const platformGuidelines = {
      meta: 'casual, engaging, 2-3 sentences with emojis',
      linkedin: 'professional, insightful, 3-5 sentences with value-driven content',
      twitter: 'concise, punchy, max 280 characters with relevant hashtags'
    };

    const style = platformGuidelines[platform as keyof typeof platformGuidelines] || 'engaging and informative';

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Write a ${style} social media caption about: ${topic}`
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const caption = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Generated caption';
    return caption.trim();
  } catch (error: any) {
    console.error('Gemini API error:', error.response?.data || error.message);
    throw new Error('Failed to generate caption with Gemini');
  }
}
