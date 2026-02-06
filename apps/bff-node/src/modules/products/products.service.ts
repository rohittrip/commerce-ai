import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '../../common/config/config.service';
import { ToolResponse, SearchProductsRequest } from '../../common/types';

@Injectable()
export class ProductsService {
  constructor(private config: ConfigService) {}

  async search(searchRequest: SearchProductsRequest): Promise<ToolResponse> {
    const url = `${this.config.mcpToolServerUrl}/api/v1/tools/execute/commerce.searchProducts`;

    try {
      const response = await axios.post(url, searchRequest, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      return response.data as ToolResponse;
    } catch (error) {
      console.error('Product search failed:', error.message);
      throw error;
    }
  }
}
