import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type { ChainInfo } from '../../types/log';

export const chainsApi = {
  list: () =>
    apiClient.get<ApiResponse<ChainInfo[]>>('/chains'),
};
