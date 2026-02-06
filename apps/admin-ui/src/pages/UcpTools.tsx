import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  CircularProgress,
  Divider,
  Grid,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ApiIcon from '@mui/icons-material/Api';
import CodeIcon from '@mui/icons-material/Code';
import SettingsIcon from '@mui/icons-material/Settings';
import { useSnackbar } from '../contexts/SnackbarContext';
import { ucpToolsApi } from '../services/api';
import type { UcpTool, CreateUcpToolDto, UpdateUcpToolDto } from '../types';
import SchemaTableView from '../components/SchemaTableView';

const TOOL_CATEGORIES = ['commerce', 'thinking', 'utility', 'integration', 'custom'];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function UcpTools() {
  const { showSnackbar } = useSnackbar();
  const [tools, setTools] = useState<UcpTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<UcpTool | null>(null);
  const [expandedTool, setExpandedTool] = useState<string | false>(false);

  // Form state
  const [formData, setFormData] = useState<CreateUcpToolDto>({
    id: '',
    displayName: '',
    description: '',
    category: 'commerce',
    enabled: true,
    requestSchema: { type: 'object', properties: {}, required: [] },
    responseSchema: { type: 'object', properties: {}, required: [] },
    defaultTimeoutMs: 30000,
    defaultRetryCount: 3,
    defaultRetryBackoffMs: 1000,
  });
  const [requestSchemaText, setRequestSchemaText] = useState('');
  const [responseSchemaText, setResponseSchemaText] = useState('');
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [dialogTab, setDialogTab] = useState(0);

  const fetchTools = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ucpToolsApi.getAll();
      setTools(data);
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to fetch tools', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || tool.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenDialog = (tool?: UcpTool) => {
    if (tool) {
      setSelectedTool(tool);
      setFormData({
        id: tool.id,
        displayName: tool.displayName,
        description: tool.description,
        category: tool.category,
        enabled: tool.enabled,
        requestSchema: tool.requestSchema,
        responseSchema: tool.responseSchema,
        defaultTimeoutMs: tool.defaultTimeoutMs,
        defaultRetryCount: tool.defaultRetryCount,
        defaultRetryBackoffMs: tool.defaultRetryBackoffMs,
      });
      setRequestSchemaText(JSON.stringify(tool.requestSchema, null, 2));
      setResponseSchemaText(JSON.stringify(tool.responseSchema, null, 2));
    } else {
      setSelectedTool(null);
      setFormData({
        id: '',
        displayName: '',
        description: '',
        category: 'commerce',
        enabled: true,
        requestSchema: { type: 'object', properties: {}, required: [] },
        responseSchema: { type: 'object', properties: {}, required: [] },
        defaultTimeoutMs: 30000,
        defaultRetryCount: 3,
        defaultRetryBackoffMs: 1000,
      });
      setRequestSchemaText(JSON.stringify({ type: 'object', properties: {}, required: [] }, null, 2));
      setResponseSchemaText(JSON.stringify({ type: 'object', properties: {}, required: [] }, null, 2));
    }
    setSchemaError(null);
    setDialogTab(0);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTool(null);
    setSchemaError(null);
  };

  const validateAndParseSchema = (text: string, name: string): object | null => {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null) {
        setSchemaError(`${name} must be a valid JSON object`);
        return null;
      }
      return parsed;
    } catch (e) {
      setSchemaError(`Invalid JSON in ${name}: ${(e as Error).message}`);
      return null;
    }
  };

  const handleSave = async () => {
    setSchemaError(null);

    const requestSchema = validateAndParseSchema(requestSchemaText, 'Request Schema');
    if (!requestSchema) return;

    const responseSchema = validateAndParseSchema(responseSchemaText, 'Response Schema');
    if (!responseSchema) return;

    try {
      if (selectedTool) {
        const updateData: UpdateUcpToolDto = {
          displayName: formData.displayName,
          description: formData.description,
          category: formData.category,
          enabled: formData.enabled,
          requestSchema,
          responseSchema,
          defaultTimeoutMs: formData.defaultTimeoutMs,
          defaultRetryCount: formData.defaultRetryCount,
          defaultRetryBackoffMs: formData.defaultRetryBackoffMs,
        };
        await ucpToolsApi.update(selectedTool.id, updateData);
        showSnackbar('Tool updated successfully', 'success');
      } else {
        const createData: CreateUcpToolDto = {
          ...formData,
          requestSchema,
          responseSchema,
        };
        await ucpToolsApi.create(createData);
        showSnackbar('Tool created successfully', 'success');
      }
      handleCloseDialog();
      fetchTools();
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to save tool', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedTool) return;
    try {
      await ucpToolsApi.delete(selectedTool.id);
      showSnackbar('Tool deleted successfully', 'success');
      setDeleteDialogOpen(false);
      setSelectedTool(null);
      fetchTools();
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to delete tool', 'error');
    }
  };

  const handleToggleEnabled = async (tool: UcpTool) => {
    try {
      await ucpToolsApi.update(tool.id, { enabled: !tool.enabled });
      showSnackbar(`Tool ${tool.enabled ? 'disabled' : 'enabled'}`, 'success');
      fetchTools();
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to update tool', 'error');
    }
  };

  const getCategoryColor = (category: string): 'primary' | 'secondary' | 'success' | 'warning' | 'info' => {
    switch (category) {
      case 'commerce': return 'primary';
      case 'thinking': return 'secondary';
      case 'utility': return 'success';
      case 'integration': return 'warning';
      default: return 'info';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            UCP Tools
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage global tool definitions and schemas for the Unified Commerce Protocol
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Tool
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {TOOL_CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Paper>

      {/* Tools List */}
      {filteredTools.length === 0 ? (
        <Alert severity="info">
          No tools found. {searchQuery || categoryFilter !== 'all' ? 'Try adjusting your filters.' : 'Click "Add Tool" to create one.'}
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredTools.map((tool) => (
            <Accordion
              key={tool.id}
              expanded={expandedTool === tool.id}
              onChange={(_, expanded) => setExpandedTool(expanded ? tool.id : false)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                  <ApiIcon color={tool.enabled ? 'primary' : 'disabled'} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography fontWeight={500}>{tool.displayName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {tool.id}
                    </Typography>
                  </Box>
                  <Chip
                    label={tool.category}
                    size="small"
                    color={getCategoryColor(tool.category)}
                    variant="outlined"
                  />
                  <Chip
                    label={tool.enabled ? 'Active' : 'Disabled'}
                    size="small"
                    color={tool.enabled ? 'success' : 'default'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    v{tool.version}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {tool.description && (
                    <Typography variant="body2" color="text.secondary">
                      {tool.description}
                    </Typography>
                  )}

                  <Divider />

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CodeIcon fontSize="small" /> Request Schema
                      </Typography>
                      <SchemaTableView schema={tool.requestSchema} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CodeIcon fontSize="small" /> Response Schema
                      </Typography>
                      <SchemaTableView schema={tool.responseSchema} />
                    </Grid>
                  </Grid>

                  <Divider />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2">
                      <strong>Timeout:</strong> {tool.defaultTimeoutMs}ms
                    </Typography>
                    <Typography variant="body2">
                      <strong>Retries:</strong> {tool.defaultRetryCount}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Backoff:</strong> {tool.defaultRetryBackoffMs}ms
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={tool.enabled}
                          onChange={() => handleToggleEnabled(tool)}
                          size="small"
                        />
                      }
                      label="Enabled"
                    />
                    <Tooltip title="Edit Tool">
                      <IconButton onClick={() => handleOpenDialog(tool)} size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Tool">
                      <IconButton
                        onClick={() => {
                          setSelectedTool(tool);
                          setDeleteDialogOpen(true);
                        }}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedTool ? 'Edit Tool' : 'Add New Tool'}
        </DialogTitle>
        <DialogContent>
          <Tabs value={dialogTab} onChange={(_, v) => setDialogTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="General" icon={<SettingsIcon />} iconPosition="start" />
            <Tab label="Request Schema" icon={<CodeIcon />} iconPosition="start" />
            <Tab label="Response Schema" icon={<CodeIcon />} iconPosition="start" />
          </Tabs>

          <TabPanel value={dialogTab} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Tool ID"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                fullWidth
                required
                disabled={!!selectedTool}
                placeholder="e.g., commerce.inventory.check"
                helperText="Unique identifier using dot notation"
              />
              <TextField
                label="Display Name"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                fullWidth
                required
                placeholder="e.g., Check Inventory"
              />
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
                placeholder="Describe what this tool does"
              />
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {TOOL_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Timeout (ms)"
                  type="number"
                  value={formData.defaultTimeoutMs}
                  onChange={(e) => setFormData({ ...formData, defaultTimeoutMs: parseInt(e.target.value) || 30000 })}
                  sx={{ width: 150 }}
                />
                <TextField
                  label="Retry Count"
                  type="number"
                  value={formData.defaultRetryCount}
                  onChange={(e) => setFormData({ ...formData, defaultRetryCount: parseInt(e.target.value) || 3 })}
                  sx={{ width: 150 }}
                />
                <TextField
                  label="Backoff (ms)"
                  type="number"
                  value={formData.defaultRetryBackoffMs}
                  onChange={(e) => setFormData({ ...formData, defaultRetryBackoffMs: parseInt(e.target.value) || 1000 })}
                  sx={{ width: 150 }}
                />
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                }
                label="Enabled"
              />
            </Box>
          </TabPanel>

          <TabPanel value={dialogTab} index={1}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Define the request schema in JSON Schema format (draft-07).
            </Alert>
            <TextField
              label="Request Schema (JSON)"
              value={requestSchemaText}
              onChange={(e) => setRequestSchemaText(e.target.value)}
              fullWidth
              multiline
              rows={15}
              InputProps={{
                sx: { fontFamily: 'monospace', fontSize: '0.875rem' },
              }}
            />
          </TabPanel>

          <TabPanel value={dialogTab} index={2}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Define the response schema in JSON Schema format (draft-07).
            </Alert>
            <TextField
              label="Response Schema (JSON)"
              value={responseSchemaText}
              onChange={(e) => setResponseSchemaText(e.target.value)}
              fullWidth
              multiline
              rows={15}
              InputProps={{
                sx: { fontFamily: 'monospace', fontSize: '0.875rem' },
              }}
            />
          </TabPanel>

          {schemaError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {schemaError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {selectedTool ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Tool</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedTool?.displayName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. All provider mappings using this tool will be affected.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
