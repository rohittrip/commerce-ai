import React from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Paper,
} from '@mui/material';
import { KeyValueEditor } from './KeyValueEditor';
import type { ApiConfig, AuthConfig, RetryConfig, RateLimitConfig } from '../types';

interface ToolApiConfigPanelProps {
  apiConfig: ApiConfig;
  onChange: (config: ApiConfig) => void;
  disabled?: boolean;
}

export const ToolApiConfigPanel: React.FC<ToolApiConfigPanelProps> = ({
  apiConfig,
  onChange,
  disabled = false,
}) => {
  const handleHeadersChange = (headers: Record<string, string>) => {
    onChange({ ...apiConfig, headers });
  };

  const handleAuthChange = (auth: Partial<AuthConfig>) => {
    onChange({
      ...apiConfig,
      auth: { ...apiConfig.auth, ...auth } as AuthConfig,
    });
  };

  const handleTimeoutChange = (timeout: number) => {
    onChange({ ...apiConfig, timeout });
  };

  const handleRetryChange = (retry: Partial<RetryConfig>) => {
    onChange({
      ...apiConfig,
      retry: {
        maxAttempts: apiConfig.retry?.maxAttempts ?? 3,
        backoffMs: apiConfig.retry?.backoffMs ?? 1000,
        retryOn: apiConfig.retry?.retryOn ?? [500, 502, 503, 504],
        ...retry,
      },
    });
  };

  const handleRateLimitChange = (rateLimit: Partial<RateLimitConfig>) => {
    onChange({
      ...apiConfig,
      rateLimit: { ...apiConfig.rateLimit, ...rateLimit },
    });
  };

  const handleRetryOnChange = (value: string) => {
    const codes = value
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 100 && n < 600);
    handleRetryChange({ retryOn: codes });
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Custom Headers Section */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Custom Headers
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add custom HTTP headers to be sent with each request to this tool's API endpoint.
            </Typography>
            <KeyValueEditor
              entries={apiConfig.headers || {}}
              onChange={handleHeadersChange}
              keyLabel="Header Name"
              valueLabel="Header Value"
              keyPlaceholder="X-Custom-Header"
              valuePlaceholder="value"
              disabled={disabled}
            />
          </Paper>
        </Grid>

        {/* Authentication Section */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Authentication
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure how this tool authenticates with the provider's API.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" disabled={disabled}>
                  <InputLabel>Auth Type</InputLabel>
                  <Select
                    value={apiConfig.auth?.type || 'none'}
                    label="Auth Type"
                    onChange={(e) => handleAuthChange({ type: e.target.value as AuthConfig['type'] })}
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="api_key">API Key (Header)</MenuItem>
                    <MenuItem value="bearer">Bearer Token</MenuItem>
                    <MenuItem value="basic">Basic Auth</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {apiConfig.auth?.type === 'api_key' && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Header Name"
                    value={apiConfig.auth?.headerName || ''}
                    onChange={(e) => handleAuthChange({ headerName: e.target.value })}
                    placeholder="X-API-Key"
                    disabled={disabled}
                  />
                </Grid>
              )}

              {(apiConfig.auth?.type === 'api_key' || apiConfig.auth?.type === 'bearer') && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Token Path"
                    value={apiConfig.auth?.tokenPath || ''}
                    onChange={(e) => handleAuthChange({ tokenPath: e.target.value })}
                    placeholder="credentials.apiKey"
                    helperText="Path in provider credentials"
                    disabled={disabled}
                  />
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Timeout Section */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Timeout
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Maximum time to wait for a response from the API.
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Timeout"
              value={apiConfig.timeout || 10000}
              onChange={(e) => handleTimeoutChange(parseInt(e.target.value, 10) || 10000)}
              InputProps={{
                endAdornment: <InputAdornment position="end">ms</InputAdornment>,
              }}
              inputProps={{ min: 1000, max: 300000, step: 1000 }}
              disabled={disabled}
            />
          </Paper>
        </Grid>

        {/* Rate Limiting Section */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Rate Limiting
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Limit the number of requests to prevent API throttling.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Requests/Minute"
                  value={apiConfig.rateLimit?.requestsPerMinute || ''}
                  onChange={(e) =>
                    handleRateLimitChange({
                      requestsPerMinute: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  inputProps={{ min: 1, max: 10000 }}
                  disabled={disabled}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Requests/Hour"
                  value={apiConfig.rateLimit?.requestsPerHour || ''}
                  onChange={(e) =>
                    handleRateLimitChange({
                      requestsPerHour: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  inputProps={{ min: 1, max: 100000 }}
                  disabled={disabled}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Retry Settings Section */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Retry Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure automatic retry behavior for failed requests.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Max Attempts"
                  value={apiConfig.retry?.maxAttempts ?? 3}
                  onChange={(e) =>
                    handleRetryChange({ maxAttempts: parseInt(e.target.value, 10) || 1 })
                  }
                  inputProps={{ min: 1, max: 10 }}
                  helperText="Number of retry attempts"
                  disabled={disabled}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Backoff"
                  value={apiConfig.retry?.backoffMs ?? 1000}
                  onChange={(e) =>
                    handleRetryChange({ backoffMs: parseInt(e.target.value, 10) || 1000 })
                  }
                  InputProps={{
                    endAdornment: <InputAdornment position="end">ms</InputAdornment>,
                  }}
                  inputProps={{ min: 100, max: 60000, step: 100 }}
                  helperText="Delay between retries"
                  disabled={disabled}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Retry on Status Codes"
                  value={(apiConfig.retry?.retryOn ?? [500, 502, 503, 504]).join(', ')}
                  onChange={(e) => handleRetryOnChange(e.target.value)}
                  helperText="Comma-separated HTTP codes"
                  disabled={disabled}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ToolApiConfigPanel;
