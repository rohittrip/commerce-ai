import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  InputAdornment,
  Tooltip,
  alpha,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  Api as ApiIcon,
  CheckCircle as CheckCircleIcon,
  Code as CodeIcon,
  PlayArrow as PlayArrowIcon,
  Tune as TuneIcon,
  Link as LinkIcon,
  SwapHoriz as SwapHorizIcon,
  Storage as StorageIcon,
  Edit as EditIcon,
  CloudUpload as CloudUploadIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { ToolApiConfigPanel } from './ToolApiConfigPanel';
import { ToolTestPanel } from './ToolTestPanel';
import { SchemaTableView } from './SchemaTableView';
import { ucpToolsApi } from '../services/api';
import type { UcpTool } from '../types';
import type {
  EnhancedToolConfig,
  EnhancedProviderToolConfigs,
  ApiConfig,
  ProviderApiEndpoint,
} from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tool-tabpanel-${index}`}
      aria-labelledby={`tool-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

interface ToolsTabProps {
  providerId: string;
  toolConfigs: EnhancedProviderToolConfigs;
  providerApis?: ProviderApiEndpoint[];
  onUpdateToolConfig: (toolName: string, config: EnhancedToolConfig) => Promise<void>;
  onUploadOpenAPI: (content: string) => Promise<void>;
  onDownloadOpenAPI: () => Promise<string>;
  onSaveProviderApi?: (api: ProviderApiEndpoint) => Promise<void>;
  onDeleteProviderApi?: (apiId: string) => Promise<void>;
}

const methodColors: Record<string, 'success' | 'primary' | 'warning' | 'error' | 'info'> = {
  GET: 'success',
  POST: 'primary',
  PUT: 'warning',
  DELETE: 'error',
  PATCH: 'info',
};

export const ToolsTab: React.FC<ToolsTabProps> = ({
  providerId,
  toolConfigs,
  providerApis = [],
  onUpdateToolConfig,
  onUploadOpenAPI,
  onDownloadOpenAPI,
  onSaveProviderApi: _onSaveProviderApi,
  onDeleteProviderApi,
}) => {
  const theme = useTheme();

  // Main view state
  const [mainTab, setMainTab] = useState<'ucp-tools' | 'provider-apis'>('ucp-tools');

  // Tool state
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [toolSubTabs, setToolSubTabs] = useState<Record<string, number>>({});
  const [localConfigs, setLocalConfigs] = useState<EnhancedProviderToolConfigs>(toolConfigs);
  const [localProviderApis, setLocalProviderApis] = useState<ProviderApiEndpoint[]>(providerApis);

  // UI state
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');

  // OpenAPI dialog state
  const [showOpenAPIDialog, setShowOpenAPIDialog] = useState(false);
  const [openapiContent, setOpenapiContent] = useState('');

  // Provider API dialog state (setters used; values reserved for dialog UI)
  const [_showApiDialog, setShowApiDialog] = useState(false);
  const [_editingApi, setEditingApi] = useState<ProviderApiEndpoint | null>(null);

  // Field mapping dialog state (reserved for future use)
  const [_showMappingDialog, _setShowMappingDialog] = useState(false);
  const [_mappingToolName, _setMappingToolName] = useState<string | null>(null);

  // UCP Tools from global registry
  const [ucpTools, setUcpTools] = useState<Record<string, UcpTool>>({});
  const [loadingUcpTools, setLoadingUcpTools] = useState(false);

  // Fetch UCP tools on mount
  React.useEffect(() => {
    const fetchUcpTools = async () => {
      try {
        setLoadingUcpTools(true);
        const tools = await ucpToolsApi.getAll();
        const toolsMap = tools.reduce((acc, tool) => {
          acc[tool.id] = tool;
          return acc;
        }, {} as Record<string, UcpTool>);
        setUcpTools(toolsMap);
      } catch (err) {
        console.error('Failed to fetch UCP tools:', err);
      } finally {
        setLoadingUcpTools(false);
      }
    };
    fetchUcpTools();
  }, []);

  const getToolSubTab = (toolName: string) => toolSubTabs[toolName] || 0;
  const setToolSubTab = (toolName: string, tab: number) => {
    setToolSubTabs((prev) => ({ ...prev, [toolName]: tab }));
  };

  // Filtered tools - merge all UCP tools with provider-specific configs
  const filteredTools = useMemo(() => {
    // Create merged tool list: all UCP tools + their provider-specific configs
    const allToolsMap: Record<string, EnhancedToolConfig> = {};

    // First, add all UCP tools from global registry
    Object.entries(ucpTools).forEach(([toolId, ucpTool]) => {
      const providerConfig = localConfigs[toolId];
      allToolsMap[toolId] = {
        ...(providerConfig || {}),
        enabled: providerConfig?.enabled ?? false,
        description: ucpTool.description || providerConfig?.description,
      };
    });

    // Also include any tools in localConfigs that aren't in ucpTools (legacy/custom tools)
    Object.entries(localConfigs).forEach(([toolId, config]) => {
      if (!allToolsMap[toolId]) {
        allToolsMap[toolId] = config;
      }
    });

    // Filter based on search and enabled status
    return Object.entries(allToolsMap).filter(([toolName, config]) => {
      const ucpTool = ucpTools[toolName];
      const matchesSearch = toolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        config.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ucpTool?.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterEnabled === 'all' ||
        (filterEnabled === 'enabled' && config.enabled) ||
        (filterEnabled === 'disabled' && !config.enabled);
      return matchesSearch && matchesFilter;
    });
  }, [ucpTools, localConfigs, searchQuery, filterEnabled]);

  // Stats - count from all UCP tools, not just provider configs
  const toolStats = useMemo(() => {
    const total = Object.keys(ucpTools).length || Object.keys(localConfigs).length; // fallback to localConfigs if ucpTools not loaded yet
    const enabled = Object.keys(ucpTools).filter(toolId => localConfigs[toolId]?.enabled).length;
    const mapped = Object.keys(ucpTools).filter(toolId => localConfigs[toolId]?.path).length;
    return { total, enabled, mapped };
  }, [ucpTools, localConfigs]);

  const apiStats = useMemo(() => {
    return { total: localProviderApis.length };
  }, [localProviderApis]);

  // Handlers
  const handleToggleTool = async (toolName: string) => {
    const currentConfig = localConfigs[toolName] || { enabled: false };
    const updatedConfig = { ...currentConfig, enabled: !currentConfig.enabled };
    try {
      setLoading(toolName);
      setError(null);
      await onUpdateToolConfig(toolName, updatedConfig);
      setLocalConfigs((prev) => ({ ...prev, [toolName]: updatedConfig }));
      setSuccess(`Tool ${toolName} ${updatedConfig.enabled ? 'enabled' : 'disabled'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Failed to update ${toolName}: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleSaveToolConfig = async (toolName: string) => {
    try {
      setLoading(toolName);
      setError(null);
      await onUpdateToolConfig(toolName, localConfigs[toolName]);
      setSuccess(`Saved configuration for ${toolName}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Failed to save ${toolName}: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleUploadOpenAPI = async () => {
    try {
      setLoading('openapi-upload');
      setError(null);
      await onUploadOpenAPI(openapiContent);
      setSuccess('OpenAPI schema imported successfully. Provider APIs have been updated.');
      setOpenapiContent('');
      setShowOpenAPIDialog(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Failed to import OpenAPI schema: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleDownloadOpenAPI = async () => {
    try {
      setLoading('openapi-download');
      const content = await onDownloadOpenAPI();
      const blob = new Blob([content], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${providerId}-openapi.yaml`;
      link.click();
      URL.revokeObjectURL(url);
      setSuccess('OpenAPI schema exported');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Failed to export: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOpenapiContent(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleMapToolToApi = (toolName: string, apiId: string) => {
    const selectedApi = localProviderApis.find(a => a.id === apiId);
    setLocalConfigs((prev) => ({
      ...prev,
      [toolName]: {
        ...prev[toolName],
        path: selectedApi?.path,
        method: selectedApi?.method,
        // Store the mapping reference
        mappings: {
          ...prev[toolName]?.mappings,
          providerApiId: apiId,
        },
      },
    }));
  };

  const handleUpdateApiConfig = (toolName: string, apiConfig: ApiConfig) => {
    setLocalConfigs((prev) => ({
      ...prev,
      [toolName]: {
        ...prev[toolName],
        apiConfig,
      },
    }));
  };

  return (
    <Box>
      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Main Tabs: UCP Tools vs Provider APIs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={mainTab}
          onChange={(_, v) => setMainTab(v)}
          sx={{ minHeight: 42 }}
        >
          <Tab
            value="ucp-tools"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon sx={{ fontSize: 18 }} />
                <span>UCP Tools</span>
                <Chip size="small" label={toolStats.total} sx={{ height: 20 }} />
              </Box>
            }
            sx={{ textTransform: 'none', minHeight: 42 }}
          />
          <Tab
            value="provider-apis"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ApiIcon sx={{ fontSize: 18 }} />
                <span>Provider APIs</span>
                <Chip size="small" label={apiStats.total} sx={{ height: 20 }} />
              </Box>
            }
            sx={{ textTransform: 'none', minHeight: 42 }}
          />
        </Tabs>
      </Box>

      {/* UCP Tools Tab Content */}
      {mainTab === 'ucp-tools' && (
        <Box>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Internal platform tools with standardized schemas. Map to provider APIs for execution.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                size="small"
                label={`${toolStats.enabled} active`}
                color="success"
                variant="outlined"
                icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
              />
              <Chip
                size="small"
                label={`${toolStats.mapped} mapped`}
                color="primary"
                variant="outlined"
                icon={<LinkIcon sx={{ fontSize: 14 }} />}
              />
            </Box>
          </Box>

          {/* Search and Filter */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
            <TextField
              size="small"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1, maxWidth: 350 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {['all', 'enabled', 'disabled'].map((filter) => (
                <Chip
                  key={filter}
                  label={filter.charAt(0).toUpperCase() + filter.slice(1)}
                  size="small"
                  variant={filterEnabled === filter ? 'filled' : 'outlined'}
                  color={filterEnabled === filter ? (filter === 'enabled' ? 'success' : 'primary') : 'default'}
                  onClick={() => setFilterEnabled(filter as any)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Box>

          {/* Tools List */}
          {loadingUcpTools ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : filteredTools.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <StorageIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {Object.keys(ucpTools).length === 0 ? 'No UCP tools available' : 'No tools match your search'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Object.keys(ucpTools).length === 0
                  ? 'Create UCP tools in the UCP Tools page to define your platform\'s standardized API interface.'
                  : 'Try adjusting your search or filter criteria.'}
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {filteredTools.map(([toolName, config]) => {
                const mappedApi = localProviderApis.find(
                  a => a.id === config.mappings?.providerApiId ||
                       (a.path === config.path && a.method === config.method)
                );

                return (
                  <Accordion
                    key={toolName}
                    expanded={expandedTool === toolName}
                    onChange={() => setExpandedTool(expandedTool === toolName ? null : toolName)}
                    sx={{
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: '8px !important',
                      '&:before': { display: 'none' },
                      '&.Mui-expanded': { margin: 0, borderColor: theme.palette.primary.main },
                      boxShadow: 'none',
                      overflow: 'hidden',
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        minHeight: 64,
                        '&.Mui-expanded': { minHeight: 64 },
                        bgcolor: config.enabled
                          ? alpha(theme.palette.success.main, 0.04)
                          : alpha(theme.palette.grey[500], 0.04),
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                        <Tooltip title={config.enabled ? 'Disable tool' : 'Enable tool'}>
                          <Switch
                            checked={config.enabled}
                            onChange={() => handleToggleTool(toolName)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={loading === toolName}
                            size="small"
                            color="success"
                          />
                        </Tooltip>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontWeight: 500, fontSize: '0.95rem' }}>
                              {toolName}
                            </Typography>
                            {mappedApi && (
                              <Tooltip title={`Mapped to: ${mappedApi.name}`}>
                                <LinkIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                              </Tooltip>
                            )}
                          </Box>
                          {config.description && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 350 }}
                            >
                              {config.description}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {mappedApi ? (
                            <>
                              <Chip
                                label={mappedApi.method}
                                size="small"
                                color={methodColors[mappedApi.method] || 'default'}
                                sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                              />
                              <Chip
                                label={mappedApi.path}
                                size="small"
                                variant="outlined"
                                sx={{ maxWidth: 160, height: 22, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                              />
                            </>
                          ) : (
                            <Chip
                              label="Not Mapped"
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ height: 22 }}
                            />
                          )}
                        </Box>
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails sx={{ p: 0 }}>
                      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: 'grey.50' }}>
                        <Tabs
                          value={getToolSubTab(toolName)}
                          onChange={(_, newValue) => setToolSubTab(toolName, newValue)}
                          sx={{ minHeight: 44 }}
                        >
                          <Tab
                            label="General"
                            icon={<TuneIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            sx={{ minHeight: 44, textTransform: 'none' }}
                          />
                          <Tab
                            label="UCP Schema"
                            icon={<CodeIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            sx={{ minHeight: 44, textTransform: 'none' }}
                          />
                          <Tab
                            label="Provider Mapping"
                            icon={<SwapHorizIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            sx={{ minHeight: 44, textTransform: 'none' }}
                          />
                          <Tab
                            label="Test"
                            icon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            sx={{ minHeight: 44, textTransform: 'none' }}
                          />
                        </Tabs>
                      </Box>

                      <Box sx={{ p: 2 }}>
                        {/* General Tab */}
                        <TabPanel value={getToolSubTab(toolName)} index={0}>
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Description"
                                value={config.description || ''}
                                onChange={(e) => {
                                  setLocalConfigs((prev) => ({
                                    ...prev,
                                    [toolName]: { ...prev[toolName], description: e.target.value },
                                  }));
                                }}
                                size="small"
                                multiline
                                rows={2}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <ToolApiConfigPanel
                                apiConfig={config.apiConfig || {}}
                                onChange={(apiConfig) => handleUpdateApiConfig(toolName, apiConfig)}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <Button
                                variant="contained"
                                onClick={() => handleSaveToolConfig(toolName)}
                                disabled={loading === toolName}
                                startIcon={loading === toolName ? <CircularProgress size={16} /> : <SaveIcon />}
                                size="small"
                              >
                                Save Configuration
                              </Button>
                            </Grid>
                          </Grid>
                        </TabPanel>

                        {/* UCP Schema Tab (Read-Only) */}
                        <TabPanel value={getToolSubTab(toolName)} index={1}>
                          <Alert severity="info" sx={{ mb: 2 }}>
                            This is the global UCP schema for this tool. Schemas are managed centrally and apply across all providers.
                            <Button
                              size="small"
                              href="/ucp-tools"
                              sx={{ ml: 1 }}
                              startIcon={<EditIcon />}
                            >
                              Edit in UCP Tools
                            </Button>
                          </Alert>

                          {loadingUcpTools ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                              <CircularProgress size={24} />
                            </Box>
                          ) : ucpTools[toolName] ? (
                            <Grid container spacing={3}>
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                  Request Schema
                                </Typography>
                                <SchemaTableView
                                  schema={ucpTools[toolName].requestSchema}
                                  emptyMessage="No request schema defined"
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                  Response Schema
                                </Typography>
                                <SchemaTableView
                                  schema={ucpTools[toolName].responseSchema}
                                  emptyMessage="No response schema defined"
                                />
                              </Grid>
                            </Grid>
                          ) : (
                            <Alert severity="warning">
                              No global UCP schema found for this tool.
                              <Button
                                size="small"
                                href="/ucp-tools"
                                sx={{ ml: 1 }}
                              >
                                Create in UCP Tools
                              </Button>
                            </Alert>
                          )}
                        </TabPanel>

                        {/* Provider Mapping Tab */}
                        <TabPanel value={getToolSubTab(toolName)} index={2}>
                          <Grid container spacing={3}>
                            {/* Select Provider API */}
                            <Grid item xs={12}>
                              <Typography variant="subtitle2" gutterBottom>
                                Map to Provider API
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Select which provider API endpoint this UCP tool should use for execution.
                              </Typography>

                              {localProviderApis.length === 0 ? (
                                <Alert severity="warning">
                                  No provider APIs available. Import from OpenAPI or add manually in the "Provider APIs" tab.
                                </Alert>
                              ) : (
                                <FormControl fullWidth size="small">
                                  <InputLabel>Provider API</InputLabel>
                                  <Select
                                    value={config.mappings?.providerApiId || ''}
                                    onChange={(e) => handleMapToolToApi(toolName, e.target.value)}
                                    label="Provider API"
                                  >
                                    <MenuItem value="">
                                      <em>None (not mapped)</em>
                                    </MenuItem>
                                    {localProviderApis.map((api) => (
                                      <MenuItem key={api.id} value={api.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                          <Chip
                                            label={api.method}
                                            size="small"
                                            color={methodColors[api.method] || 'default'}
                                            sx={{ minWidth: 60 }}
                                          />
                                          <Typography variant="body2" sx={{ flex: 1 }}>
                                            {api.name}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {api.path}
                                          </Typography>
                                        </Box>
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              )}
                            </Grid>

                            {/* Field Mappings */}
                            {mappedApi && (
                              <Grid item xs={12}>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="subtitle2" gutterBottom>
                                  Field Mappings
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                  Map UCP schema fields to provider API fields.
                                </Typography>

                                <Paper variant="outlined" sx={{ p: 2 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Paper sx={{ flex: 1, p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                      <Typography variant="caption" color="primary.main" fontWeight={600}>
                                        UCP SCHEMA
                                      </Typography>
                                      <Typography variant="body2">{toolName}</Typography>
                                    </Paper>
                                    <ArrowForwardIcon color="action" />
                                    <Paper sx={{ flex: 1, p: 1.5, bgcolor: alpha(theme.palette.success.main, 0.05) }}>
                                      <Typography variant="caption" color="success.main" fontWeight={600}>
                                        PROVIDER API
                                      </Typography>
                                      <Typography variant="body2">{mappedApi.name}</Typography>
                                    </Paper>
                                  </Box>

                                  <TableContainer>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                                          <TableCell sx={{ fontWeight: 600 }}>UCP Field</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Provider Field</TableCell>
                                          <TableCell sx={{ fontWeight: 600, width: 120 }}>Transform</TableCell>
                                          <TableCell sx={{ width: 60 }}></TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {Object.entries(config.mappings?.fieldMappings || {}).length === 0 ? (
                                          <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                              <Typography variant="body2" color="text.secondary">
                                                No field mappings configured. Add mappings to transform data between schemas.
                                              </Typography>
                                            </TableCell>
                                          </TableRow>
                                        ) : (
                                          Object.entries(config.mappings?.fieldMappings || {}).map(([ucpField, providerField]) => (
                                            <TableRow key={ucpField} hover>
                                              <TableCell>
                                                <Chip label={ucpField} size="small" variant="outlined" />
                                              </TableCell>
                                              <TableCell>
                                                <Chip label={providerField} size="small" color="primary" variant="outlined" />
                                              </TableCell>
                                              <TableCell>
                                                <Typography variant="caption" color="text.secondary">none</Typography>
                                              </TableCell>
                                              <TableCell>
                                                <IconButton size="small" color="error">
                                                  <DeleteIcon fontSize="small" />
                                                </IconButton>
                                              </TableCell>
                                            </TableRow>
                                          ))
                                        )}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>

                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    sx={{ mt: 2 }}
                                    onClick={() => {
                                      const ucpField = prompt('Enter UCP field name:');
                                      const providerField = prompt('Enter Provider field name:');
                                      if (ucpField && providerField) {
                                        setLocalConfigs((prev) => ({
                                          ...prev,
                                          [toolName]: {
                                            ...prev[toolName],
                                            mappings: {
                                              ...prev[toolName]?.mappings,
                                              fieldMappings: {
                                                ...prev[toolName]?.mappings?.fieldMappings,
                                                [ucpField]: providerField,
                                              },
                                            },
                                          },
                                        }));
                                      }
                                    }}
                                  >
                                    Add Field Mapping
                                  </Button>
                                </Paper>
                              </Grid>
                            )}

                            <Grid item xs={12}>
                              <Button
                                variant="contained"
                                onClick={() => handleSaveToolConfig(toolName)}
                                disabled={loading === toolName}
                                startIcon={loading === toolName ? <CircularProgress size={16} /> : <SaveIcon />}
                                size="small"
                              >
                                Save Mapping
                              </Button>
                            </Grid>
                          </Grid>
                        </TabPanel>

                        {/* Test Tab */}
                        <TabPanel value={getToolSubTab(toolName)} index={3}>
                          <ToolTestPanel providerId={providerId} toolName={toolName} config={config} />
                        </TabPanel>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* Provider APIs Tab Content */}
      {mainTab === 'provider-apis' && (
        <Box>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                External provider API endpoints. Import from OpenAPI spec or add manually.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CloudUploadIcon />}
                onClick={() => setShowOpenAPIDialog(true)}
              >
                Import OpenAPI
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadOpenAPI}
                disabled={loading === 'openapi-download'}
              >
                Export
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingApi(null);
                  setShowApiDialog(true);
                }}
              >
                Add API
              </Button>
            </Box>
          </Box>

          {/* Provider APIs List */}
          {localProviderApis.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <ApiIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Provider APIs
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Import from an OpenAPI specification or add APIs manually.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => setShowOpenAPIDialog(true)}
              >
                Import OpenAPI Spec
              </Button>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600, width: 80 }}>Method</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Path</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 100 }}>Mapped To</TableCell>
                    <TableCell sx={{ width: 100 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {localProviderApis.map((api) => {
                    const mappedTools = Object.entries(localConfigs).filter(
                      ([_, config]) => config.mappings?.providerApiId === api.id ||
                                       (config.path === api.path && config.method === api.method)
                    );

                    return (
                      <TableRow key={api.id} hover>
                        <TableCell>
                          <Chip
                            label={api.method}
                            size="small"
                            color={methodColors[api.method] || 'default'}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {api.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                            {api.path}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {api.summary || api.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {mappedTools.length > 0 ? (
                            <Tooltip title={mappedTools.map(([name]) => name).join(', ')}>
                              <Chip
                                label={`${mappedTools.length} tool${mappedTools.length > 1 ? 's' : ''}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              Not mapped
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingApi(api);
                                setShowApiDialog(true);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                if (confirm(`Delete API "${api.name}"?`)) {
                                  setLocalProviderApis(prev => prev.filter(a => a.id !== api.id));
                                  onDeleteProviderApi?.(api.id);
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* OpenAPI Import Dialog */}
      <Dialog open={showOpenAPIDialog} onClose={() => setShowOpenAPIDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUploadIcon color="primary" />
            Import Provider OpenAPI Specification
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload the provider's OpenAPI specification to automatically import their API endpoints.
            These will be stored and can be mapped to your UCP tools.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <input
              accept=".yaml,.yml,.json"
              style={{ display: 'none' }}
              id="openapi-file-dialog"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="openapi-file-dialog">
              <Button variant="outlined" component="span" startIcon={<UploadIcon />}>
                Upload File
              </Button>
            </label>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={12}
            value={openapiContent}
            onChange={(e) => setOpenapiContent(e.target.value)}
            placeholder="Paste OpenAPI YAML/JSON content here..."
            variant="outlined"
            sx={{ fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOpenAPIDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUploadOpenAPI}
            disabled={!openapiContent || loading === 'openapi-upload'}
            startIcon={loading === 'openapi-upload' ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            Import & Parse
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ToolsTab;
