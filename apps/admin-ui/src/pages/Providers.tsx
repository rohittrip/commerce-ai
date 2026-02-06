import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
  Avatar,
  Badge,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  CheckCircle,
  Refresh,
  CloudDone,
  Store as StoreIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Error as ErrorIcon,
  Link as LinkIcon,
  Shield as ShieldIcon,
  Storage as StorageIcon,
  Api as ApiIcon,
} from '@mui/icons-material';
import { providersApi } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';
import { ToolsTab } from '../components/ToolsTab';
import { ProviderCategoriesTab } from '../components/ProviderCategoriesTab';
import type { ProviderConfig, ProviderStats, EnhancedToolConfig } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export default function Providers() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);
  const [providerStats, setProviderStats] = useState<ProviderStats | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [testing, setTesting] = useState(false);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      loadProviderStats(selectedProvider.providerId);
    }
  }, [selectedProvider]);

  const loadProviders = async () => {
    try {
      const data = await providersApi.getAll();
      setProviders(data);
      if (data.length > 0 && !selectedProvider) {
        setSelectedProvider(data[0]);
      }
    } catch (error: any) {
      showSnackbar('Failed to load providers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProviderStats = async (providerId: string) => {
    try {
      const stats = await providersApi.getStats(providerId);
      setProviderStats(stats);
    } catch (error: any) {
      console.error('Failed to load provider stats', error);
    }
  };

  const handleToggleProvider = async (provider: ProviderConfig) => {
    try {
      await providersApi.update(provider.providerId, {
        enabled: !provider.enabled,
      });
      showSnackbar(
        `Provider ${provider.enabled ? 'disabled' : 'enabled'} successfully`,
        'success'
      );
      loadProviders();
    } catch (error: any) {
      showSnackbar('Failed to update provider', 'error');
    }
  };

  const handleTestConnection = async () => {
    if (!selectedProvider) return;

    setTesting(true);
    try {
      const result = await providersApi.testConnection(selectedProvider.providerId);
      if (result.success) {
        showSnackbar('Connection test successful', 'success');
      } else {
        showSnackbar(`Connection test failed: ${result.message}`, 'error');
      }
    } catch (error: any) {
      showSnackbar('Connection test failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleToggleCapability = async (capabilityName: string, enabled: boolean) => {
    if (!selectedProvider) return;

    const updatedCapabilities = selectedProvider.capabilities.map((cap) =>
      cap.name === capabilityName ? { ...cap, enabled } : cap
    );

    try {
      await providersApi.update(selectedProvider.providerId, {
        capabilities: updatedCapabilities,
      });
      showSnackbar('Capability updated successfully', 'success');
      loadProviders();
    } catch (error: any) {
      showSnackbar('Failed to update capability', 'error');
    }
  };

  const getProviderInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getProviderColor = (providerId: string) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.info.main,
      theme.palette.warning.main,
    ];
    const hash = providerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Providers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your commerce provider integrations
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadProviders}
          size="small"
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Provider List - Left Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 0, overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Connected Providers
              </Typography>
            </Box>
            <Box sx={{ p: 1 }}>
              {providers.map((provider) => (
                <Box
                  key={provider.providerId}
                  onClick={() => setSelectedProvider(provider)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    mb: 0.5,
                    bgcolor: selectedProvider?.providerId === provider.providerId
                      ? alpha(theme.palette.primary.main, 0.08)
                      : 'transparent',
                    border: selectedProvider?.providerId === provider.providerId
                      ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                      : '1px solid transparent',
                    '&:hover': {
                      bgcolor: selectedProvider?.providerId === provider.providerId
                        ? alpha(theme.palette.primary.main, 0.08)
                        : alpha(theme.palette.grey[500], 0.08),
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: provider.enabled ? 'success.main' : 'grey.400',
                          border: '2px solid white',
                        }}
                      />
                    }
                  >
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: alpha(getProviderColor(provider.providerId), 0.15),
                        color: getProviderColor(provider.providerId),
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      {getProviderInitials(provider.displayName)}
                    </Avatar>
                  </Badge>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {provider.displayName}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {provider.providerName}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Provider Details - Main Content */}
        <Grid item xs={12} md={9}>
          {selectedProvider ? (
            <Paper sx={{ overflow: 'hidden' }}>
              {/* Provider Header */}
              <Box
                sx={{
                  p: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  bgcolor: alpha(getProviderColor(selectedProvider.providerId), 0.04),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: alpha(getProviderColor(selectedProvider.providerId), 0.15),
                      color: getProviderColor(selectedProvider.providerId),
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    {getProviderInitials(selectedProvider.displayName)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {selectedProvider.displayName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {selectedProvider.providerName}
                      </Typography>
                      <Chip
                        size="small"
                        label={selectedProvider.enabled ? 'Active' : 'Inactive'}
                        color={selectedProvider.enabled ? 'success' : 'default'}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title="Test Connection">
                    <IconButton
                      onClick={handleTestConnection}
                      disabled={testing}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
                      }}
                    >
                      {testing ? <CircularProgress size={20} /> : <CloudDone fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedProvider.enabled}
                        onChange={() => handleToggleProvider(selectedProvider)}
                        color="success"
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2" color="text.secondary">
                        Enabled
                      </Typography>
                    }
                    sx={{ ml: 1 }}
                  />
                </Box>
              </Box>

              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs
                  value={tabValue}
                  onChange={(_, v) => setTabValue(v)}
                  sx={{
                    minHeight: 48,
                    '& .MuiTab-root': {
                      minHeight: 48,
                      textTransform: 'none',
                      fontWeight: 500,
                    },
                  }}
                >
                  <Tab label="Overview" />
                  <Tab label="Capabilities" />
                  <Tab label="Categories" />
                  <Tab label="Tools" />
                  <Tab label="Statistics" />
                </Tabs>
              </Box>

              <Box sx={{ p: 3 }}>
                {/* Overview Tab */}
                <TabPanel value={tabValue} index={0}>
                  <Grid container spacing={3}>
                    {/* Quick Stats */}
                    <Grid item xs={12}>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Paper
                            variant="outlined"
                            sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}
                          >
                            <StorageIcon sx={{ color: 'primary.main', mb: 1 }} />
                            <Typography variant="h5" fontWeight={600}>
                              {Object.keys(selectedProvider.toolConfigs || {}).length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              UCP Tools
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Paper
                            variant="outlined"
                            sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}
                          >
                            <ApiIcon sx={{ color: 'info.main', mb: 1 }} />
                            <Typography variant="h5" fontWeight={600}>
                              {(selectedProvider as any).providerApis?.length || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Provider APIs
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Paper
                            variant="outlined"
                            sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}
                          >
                            <ShieldIcon sx={{ color: 'success.main', mb: 1 }} />
                            <Typography variant="h5" fontWeight={600}>
                              {selectedProvider.capabilities.filter(c => c.enabled).length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Active Capabilities
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Paper
                            variant="outlined"
                            sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}
                          >
                            <LinkIcon sx={{ color: 'warning.main', mb: 1 }} />
                            <Typography variant="h5" fontWeight={600}>
                              {Object.values(selectedProvider.toolConfigs || {}).filter((t: any) => t.path).length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Mapped Tools
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* Provider Details */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Provider Details
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Provider ID
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {selectedProvider.providerId}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Display Name
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {selectedProvider.displayName}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Status
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: selectedProvider.enabled ? 'success.main' : 'grey.400',
                                }}
                              />
                              <Typography variant="body2" fontWeight={500}>
                                {selectedProvider.enabled ? 'Active' : 'Inactive'}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Last Updated
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {new Date(selectedProvider.metadata.updatedAt).toLocaleDateString()}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>

                    {/* Active Capabilities */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Active Capabilities
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          {selectedProvider.capabilities
                            .filter((cap) => cap.enabled)
                            .map((cap) => (
                              <Chip
                                key={cap.name}
                                label={cap.name}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))}
                          {selectedProvider.capabilities.filter((cap) => cap.enabled).length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                              No capabilities enabled
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </TabPanel>

                {/* Capabilities Tab */}
                <TabPanel value={tabValue} index={1}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Manage which capabilities are enabled for this provider
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Capability</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, width: 100 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedProvider.capabilities.map((cap) => (
                          <TableRow key={cap.name} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: cap.enabled ? 'success.main' : 'grey.300',
                                  }}
                                />
                                <Typography variant="body2" fontWeight={500}>
                                  {cap.name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {cap.description}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Switch
                                checked={cap.enabled}
                                onChange={(e) =>
                                  handleToggleCapability(cap.name, e.target.checked)
                                }
                                size="small"
                                color="success"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </TabPanel>

                {/* Categories Tab */}
                <TabPanel value={tabValue} index={2}>
                  <ProviderCategoriesTab providerId={selectedProvider.providerId} />
                </TabPanel>

                {/* Tools Tab */}
                <TabPanel value={tabValue} index={3}>
                  <ToolsTab
                    providerId={selectedProvider.providerId}
                    toolConfigs={selectedProvider.toolConfigs || {}}
                    onUpdateToolConfig={async (toolName: string, config: EnhancedToolConfig) => {
                      await providersApi.updateEnhancedToolConfig(selectedProvider.providerId, toolName, config);
                      showSnackbar('Tool configuration updated', 'success');
                      loadProviders();
                    }}
                    onUploadOpenAPI={async (content: string) => {
                      const result = await providersApi.uploadOpenAPI(selectedProvider.providerId, content);
                      showSnackbar(`OpenAPI uploaded: ${result.tools.length} tools found`, 'success');
                      loadProviders();
                    }}
                    onDownloadOpenAPI={async () => {
                      return await providersApi.downloadOpenAPI(selectedProvider.providerId);
                    }}
                  />
                </TabPanel>

                {/* Statistics Tab */}
                <TabPanel value={tabValue} index={4}>
                  {providerStats ? (
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}
                        >
                          <TimelineIcon sx={{ color: 'primary.main', fontSize: 32, mb: 1 }} />
                          <Typography variant="h4" fontWeight={600}>
                            {providerStats.totalRequests.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total Requests
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}
                        >
                          <CheckCircle sx={{ color: 'success.main', fontSize: 32, mb: 1 }} />
                          <Typography variant="h4" fontWeight={600}>
                            {(providerStats.successRate * 100).toFixed(1)}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Success Rate
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={providerStats.successRate * 100}
                            color="success"
                            sx={{ mt: 1, borderRadius: 1 }}
                          />
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}
                        >
                          <SpeedIcon sx={{ color: 'info.main', fontSize: 32, mb: 1 }} />
                          <Typography variant="h4" fontWeight={600}>
                            {providerStats.avgResponseTime.toFixed(0)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Avg Response (ms)
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}
                        >
                          {providerStats.lastError ? (
                            <>
                              <ErrorIcon sx={{ color: 'error.main', fontSize: 32, mb: 1 }} />
                              <Chip
                                label="Has Errors"
                                color="error"
                                size="small"
                              />
                            </>
                          ) : (
                            <>
                              <CheckCircle sx={{ color: 'success.main', fontSize: 32, mb: 1 }} />
                              <Chip
                                label="Healthy"
                                color="success"
                                size="small"
                              />
                            </>
                          )}
                          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                            Health Status
                          </Typography>
                        </Paper>
                      </Grid>
                      {providerStats.lastError && (
                        <Grid item xs={12}>
                          <Alert severity="error" sx={{ borderRadius: 2 }}>
                            <Typography variant="subtitle2">Last Error:</Typography>
                            {providerStats.lastError}
                            {providerStats.lastErrorTime && (
                              <Typography variant="caption" display="block" mt={0.5}>
                                {new Date(providerStats.lastErrorTime).toLocaleString()}
                              </Typography>
                            )}
                          </Alert>
                        </Grid>
                      )}
                    </Grid>
                  ) : (
                    <Box display="flex" justifyContent="center" p={3}>
                      <CircularProgress />
                    </Box>
                  )}
                </TabPanel>
              </Box>
            </Paper>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <StoreIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Select a Provider
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a provider from the list to view and manage its configuration.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
