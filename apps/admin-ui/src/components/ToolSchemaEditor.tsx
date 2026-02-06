import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Restore as RestoreIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { providersApi } from '../services/api';
import type { ToolSchema } from '../types';

interface ToolSchemaEditorProps {
  providerId: string;
  toolName: string;
  onSchemaChange?: () => void;
}

export const ToolSchemaEditor: React.FC<ToolSchemaEditorProps> = ({
  providerId,
  toolName,
  onSchemaChange,
}) => {
  const [schemaType, setSchemaType] = useState<'request' | 'response'>('request');
  const [schema, setSchema] = useState<ToolSchema | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const loadSchema = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await providersApi.getToolSchema(providerId, toolName, schemaType);
      setSchema(data);
      setEditContent(JSON.stringify(data.schemaContent, null, 2));
      setHasChanges(false);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // No custom schema, try to load default
        try {
          const defaultSchema = await providersApi.getDefaultToolSchema(toolName, schemaType);
          setSchema({
            providerId,
            toolName,
            schemaType,
            schemaContent: defaultSchema,
            isCustom: false,
            version: 0,
          });
          setEditContent(JSON.stringify(defaultSchema, null, 2));
          setHasChanges(false);
        } catch {
          setSchema(null);
          setEditContent('{\n  "$schema": "http://json-schema.org/draft-07/schema#",\n  "type": "object",\n  "properties": {\n    \n  }\n}');
          setHasChanges(false);
        }
      } else {
        setError(`Failed to load schema: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [providerId, toolName, schemaType]);

  useEffect(() => {
    loadSchema();
  }, [loadSchema]);

  const handleSchemaTypeChange = (_: React.MouseEvent<HTMLElement>, newType: 'request' | 'response' | null) => {
    if (newType) {
      setSchemaType(newType);
    }
  };

  const handleContentChange = (value: string) => {
    setEditContent(value);
    setHasChanges(true);
  };

  const validateJson = (content: string): boolean => {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateJson(editContent)) {
      setError('Invalid JSON format. Please fix syntax errors before saving.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const schemaContent = JSON.parse(editContent);
      await providersApi.uploadToolSchema(providerId, toolName, schemaType, schemaContent);
      setSuccess('Schema saved successfully');
      setHasChanges(false);
      onSchemaChange?.();
      await loadSchema();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Failed to save schema: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to the default schema? This will delete your custom schema.')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await providersApi.resetToolSchema(providerId, toolName, schemaType);
      setSuccess('Schema reset to default');
      onSchemaChange?.();
      await loadSchema();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Failed to reset schema: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([editContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${toolName}-${schemaType}-schema.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (validateJson(content)) {
          setEditContent(JSON.stringify(JSON.parse(content), null, 2));
          setHasChanges(true);
          setError(null);
        } else {
          setError('Invalid JSON file. Please upload a valid JSON schema.');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  return (
    <Box>
      {/* Schema Type Toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <ToggleButtonGroup
          value={schemaType}
          exclusive
          onChange={handleSchemaTypeChange}
          size="small"
        >
          <ToggleButton value="request">Request Schema</ToggleButton>
          <ToggleButton value="response">Response Schema</ToggleButton>
        </ToggleButtonGroup>

        {schema && (
          <Chip
            label={schema.isCustom ? 'Custom Schema' : 'Default Schema'}
            color={schema.isCustom ? 'primary' : 'default'}
            size="small"
            variant={schema.isCustom ? 'filled' : 'outlined'}
          />
        )}

        {hasChanges && (
          <Chip label="Unsaved changes" color="warning" size="small" />
        )}
      </Box>

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

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <input
          accept=".json"
          style={{ display: 'none' }}
          id={`schema-file-upload-${toolName}-${schemaType}`}
          type="file"
          onChange={handleFileUpload}
        />
        <label htmlFor={`schema-file-upload-${toolName}-${schemaType}`}>
          <Button
            variant="outlined"
            component="span"
            startIcon={<UploadIcon />}
            size="small"
            disabled={loading || saving}
          >
            Upload
          </Button>
        </label>

        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          size="small"
          disabled={loading || !editContent}
        >
          Download
        </Button>

        {schema?.isCustom && (
          <Button
            variant="outlined"
            color="warning"
            startIcon={<RestoreIcon />}
            onClick={handleReset}
            size="small"
            disabled={loading || saving}
          >
            Reset to Default
          </Button>
        )}
      </Box>

      {/* Schema Editor */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 1 }}>
          <TextField
            fullWidth
            multiline
            rows={15}
            value={editContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Enter JSON Schema..."
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              },
            }}
            error={editContent.length > 0 && !validateJson(editContent)}
          />
        </Paper>
      )}

      {/* Save Button */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={loading || saving || !hasChanges || !validateJson(editContent)}
        >
          Save Schema
        </Button>
      </Box>
    </Box>
  );
};

export default ToolSchemaEditor;
