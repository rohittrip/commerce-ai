import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { providersApi } from '../services/api';
import type { ToolTestResult, EnhancedToolConfig } from '../types';

interface ToolTestPanelProps {
  providerId: string;
  toolName: string;
  config: EnhancedToolConfig;
}

const SAMPLE_PAYLOADS: Record<string, object> = {
  'commerce.searchProducts': {
    query: 'laptop',
    filters: { category: 'electronics' },
    pagination: { page: 1, pageSize: 10 },
  },
  'commerce.getProductDetails': {
    productId: 'prod-123',
  },
  'commerce.cart.addItem': {
    userId: 'user-123',
    productId: 'prod-123',
    quantity: 1,
  },
  'commerce.cart.getCart': {
    userId: 'user-123',
  },
};

export const ToolTestPanel: React.FC<ToolTestPanelProps> = ({
  providerId,
  toolName,
  config,
}) => {
  const [payload, setPayload] = useState<string>(
    JSON.stringify(SAMPLE_PAYLOADS[toolName] || {}, null, 2)
  );
  const [result, setResult] = useState<ToolTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateJson = (content: string): boolean => {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  };

  const handleTest = async () => {
    if (!validateJson(payload)) {
      setError('Invalid JSON payload. Please fix syntax errors.');
      return;
    }

    try {
      setTesting(true);
      setError(null);
      setResult(null);

      const parsedPayload = JSON.parse(payload);
      const testResult = await providersApi.testToolEndpoint(providerId, toolName, parsedPayload);
      setResult(testResult);
    } catch (err: any) {
      setError(`Test failed: ${err.message}`);
      setResult({
        success: false,
        responseTime: 0,
        error: err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleLoadSample = () => {
    const sample = SAMPLE_PAYLOADS[toolName];
    if (sample) {
      setPayload(JSON.stringify(sample, null, 2));
    }
  };

  return (
    <Box>
      {/* Info Banner */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Test this tool endpoint with a custom payload. The request will be sent to the provider's API
        using the configured settings (path: <strong>{config.path || 'N/A'}</strong>, method:{' '}
        <strong>{config.method || 'POST'}</strong>).
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Request Payload */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                Request Payload
              </Typography>
              {SAMPLE_PAYLOADS[toolName] && (
                <Button size="small" onClick={handleLoadSample}>
                  Load Sample
                </Button>
              )}
            </Box>

            <TextField
              fullWidth
              multiline
              rows={12}
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="Enter JSON payload..."
              variant="outlined"
              error={payload.length > 0 && !validateJson(payload)}
              helperText={payload.length > 0 && !validateJson(payload) ? 'Invalid JSON' : ''}
              InputProps={{
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                },
              }}
            />

            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleTest}
                disabled={testing || !validateJson(payload)}
                startIcon={testing ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                fullWidth
              >
                {testing ? 'Testing...' : 'Execute Test'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Response */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Response
            </Typography>

            {result ? (
              <Box>
                {/* Status Chips */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip
                    icon={result.success ? <CheckCircleIcon /> : <ErrorIcon />}
                    label={result.success ? 'Success' : 'Failed'}
                    color={result.success ? 'success' : 'error'}
                    size="small"
                  />
                  <Chip
                    label={`${result.responseTime}ms`}
                    variant="outlined"
                    size="small"
                  />
                  {result.statusCode && (
                    <Chip
                      label={`HTTP ${result.statusCode}`}
                      variant="outlined"
                      size="small"
                      color={result.statusCode >= 400 ? 'error' : 'default'}
                    />
                  )}
                </Box>

                {/* Validation Results */}
                {result.validationResult && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Validation:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={`Request: ${result.validationResult.requestValid ? 'Valid' : 'Invalid'}`}
                        color={result.validationResult.requestValid ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`Response: ${result.validationResult.responseValid ? 'Valid' : 'Invalid'}`}
                        color={result.validationResult.responseValid ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    {result.validationResult.errors && result.validationResult.errors.length > 0 && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        {result.validationResult.errors.join(', ')}
                      </Alert>
                    )}
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Response Body */}
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Response Body:
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={
                    result.error
                      ? result.error
                      : JSON.stringify(result.response, null, 2)
                  }
                  variant="outlined"
                  InputProps={{
                    readOnly: true,
                    sx: {
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      bgcolor: 'action.hover',
                    },
                  }}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 300,
                  color: 'text.secondary',
                }}
              >
                <Typography variant="body2">
                  Execute a test to see the response
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ToolTestPanel;
