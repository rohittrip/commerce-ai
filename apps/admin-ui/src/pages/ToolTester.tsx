import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  Grid,
  Alert,
  Divider,
} from '@mui/material';
import { PlayArrow } from '@mui/icons-material';
import { toolsApi, providersApi } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';
import type { ProviderConfig } from '../types';

const tools = [
  'commerce.searchProducts',
  'commerce.compareProducts',
  'commerce.cart.addItem',
  'commerce.cart.updateItemQty',
  'commerce.cart.removeItem',
  'commerce.cart.getCart',
  'commerce.checkout.create',
  'commerce.checkout.update',
  'commerce.checkout.get',
  'commerce.checkout.complete',
  'commerce.checkout.cancel',
  'commerce.product.estimateShipping',
  'commerce.product.listVariants',
  'commerce.promotions.get',
  'commerce.promotions.validateCoupon',
];

const exampleRequests: Record<string, string> = {
  'commerce.searchProducts': JSON.stringify({
    query: 'headphones',
    filters: { priceMax: 5000 },
  }, null, 2),
  'commerce.compareProducts': JSON.stringify({
    productIds: ['HP001', 'HP002'],
  }, null, 2),
  'commerce.cart.addItem': JSON.stringify({
    productId: 'HP001',
    provider: 'mock',
    quantity: 1,
  }, null, 2),
  'commerce.cart.getCart': JSON.stringify({
    cartId: 'cart-001',
  }, null, 2),
  'commerce.checkout.create': JSON.stringify({
    userId: 'user-001',
    cartId: 'cart-001',
  }, null, 2),
  'commerce.checkout.update': JSON.stringify({
    checkoutId: 'checkout-001',
    shippingAddressId: 'addr-001',
    paymentMethod: 'COD',
  }, null, 2),
  'commerce.checkout.complete': JSON.stringify({
    checkoutId: 'checkout-001',
  }, null, 2),
};

export default function ToolTester() {
  const [selectedTool, setSelectedTool] = useState('commerce.searchProducts');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [request, setRequest] = useState(exampleRequests['commerce.searchProducts']);
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const data = await providersApi.getAll();
      setProviders(data.filter(p => p.enabled));
    } catch (err) {
      console.error('Failed to load providers:', err);
      showSnackbar('Failed to load providers', 'error');
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleToolChange = (tool: string) => {
    setSelectedTool(tool);
    setRequest(exampleRequests[tool] || '{}');
    setResponse('');
    setError('');
  };

  const handleTest = async () => {
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const requestData = JSON.parse(request);
      let result;

      if (selectedProvider) {
        // Test against specific provider
        result = await providersApi.testToolEndpoint(
          selectedProvider,
          selectedTool,
          requestData
        );
      } else {
        // Test without provider constraint (orchestrator decides)
        result = await toolsApi.test({
          toolName: selectedTool,
          request: requestData,
        });
      }

      if (result.success) {
        setResponse(JSON.stringify(result.response, null, 2));
        showSnackbar('Tool executed successfully', 'success');
      } else {
        setError(result.error || 'Tool execution failed');
        showSnackbar('Tool execution failed', 'error');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid request format');
      showSnackbar('Invalid request format', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Tool Tester
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Request
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TextField
              select
              fullWidth
              label="Select Tool"
              value={selectedTool}
              onChange={(e) => handleToolChange(e.target.value)}
              sx={{ mb: 2 }}
            >
              {tools.map((tool) => (
                <MenuItem key={tool} value={tool}>
                  {tool}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Select Provider (Optional)"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              sx={{ mb: 2 }}
              disabled={loadingProviders}
              helperText={
                selectedProvider
                  ? 'Testing against specific provider'
                  : 'No provider selected - orchestrator will route the request'
              }
            >
              <MenuItem value="">
                <em>All Providers (Default)</em>
              </MenuItem>
              {providers.map((provider) => (
                <MenuItem key={provider.providerId} value={provider.providerId}>
                  {provider.displayName || provider.providerName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              multiline
              rows={15}
              label="Request JSON"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              sx={{ mb: 2, fontFamily: 'monospace' }}
            />
            <Button
              variant="contained"
              fullWidth
              startIcon={<PlayArrow />}
              onClick={handleTest}
              disabled={loading}
            >
              {loading ? 'Testing...' : 'Test Tool'}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Response
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {response && (
              <TextField
                fullWidth
                multiline
                rows={20}
                value={response}
                InputProps={{ readOnly: true }}
                sx={{ fontFamily: 'monospace' }}
              />
            )}
            {!response && !error && (
              <Typography variant="body2" color="text.secondary" align="center" mt={5}>
                Response will appear here after testing
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
