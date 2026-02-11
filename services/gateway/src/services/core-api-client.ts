import axios from 'axios';
import { CoreAPIRequest, CoreAPIResponse } from '../types';

export class CoreAPIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.CORE_API_URL || 'http://core-api:7777';
  }

  async sendMessage(request: CoreAPIRequest): Promise<CoreAPIResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/api/chat`, request, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Core API request failed:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          return {
            response: '❌ Core API is unavailable. Please try again later.',
            metadata: { error: 'connection_refused' }
          };
        }
        
        return {
          response: `❌ Request failed: ${error.message}`,
          metadata: { error: error.code }
        };
      }

      return {
        response: '❌ An unexpected error occurred.',
        metadata: { error: 'unknown' }
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
