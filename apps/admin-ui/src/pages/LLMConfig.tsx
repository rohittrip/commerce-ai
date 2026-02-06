import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { llmConfigApi } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';
import type { LLMProvider } from '../types';

const providers = ['openai', 'claude', 'gemini'];
const models = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  claude: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  gemini: ['gemini-pro', 'gemini-pro-vision'],
};

export default function LLMConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [primary, setPrimary] = useState<LLMProvider>({
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
  });
  const [fallback, setFallback] = useState<LLMProvider>({
    provider: 'claude',
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 2000,
  });
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const configs = await llmConfigApi.getAll();
      const primaryConfig = configs.find((c) => c.key === 'llm.provider.primary');
      const fallbackConfig = configs.find((c) => c.key === 'llm.provider.fallback');

      if (primaryConfig) setPrimary(primaryConfig.value);
      if (fallbackConfig) setFallback(fallbackConfig.value);
    } catch (error: any) {
      showSnackbar('Failed to load LLM config', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await llmConfigApi.update('llm.provider.primary', primary);
      await llmConfigApi.update('llm.provider.fallback', fallback);
      showSnackbar('LLM configuration saved successfully', 'success');
    } catch (error: any) {
      showSnackbar('Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
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
      <Typography variant="h4" gutterBottom>
        LLM Configuration
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Primary Provider
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Provider"
                  value={primary.provider}
                  onChange={(e) =>
                    setPrimary({ ...primary, provider: e.target.value as any })
                  }
                >
                  {providers.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p.toUpperCase()}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Model"
                  value={primary.model}
                  onChange={(e) => setPrimary({ ...primary, model: e.target.value })}
                >
                  {models[primary.provider]?.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Temperature"
                  value={primary.temperature}
                  onChange={(e) =>
                    setPrimary({ ...primary, temperature: parseFloat(e.target.value) })
                  }
                  inputProps={{ min: 0, max: 2, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Tokens"
                  value={primary.maxTokens}
                  onChange={(e) =>
                    setPrimary({ ...primary, maxTokens: parseInt(e.target.value) })
                  }
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Fallback Provider
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Provider"
                  value={fallback.provider}
                  onChange={(e) =>
                    setFallback({ ...fallback, provider: e.target.value as any })
                  }
                >
                  {providers.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p.toUpperCase()}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Model"
                  value={fallback.model}
                  onChange={(e) => setFallback({ ...fallback, model: e.target.value })}
                >
                  {models[fallback.provider]?.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Temperature"
                  value={fallback.temperature}
                  onChange={(e) =>
                    setFallback({ ...fallback, temperature: parseFloat(e.target.value) })
                  }
                  inputProps={{ min: 0, max: 2, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Tokens"
                  value={fallback.maxTokens}
                  onChange={(e) =>
                    setFallback({ ...fallback, maxTokens: parseInt(e.target.value) })
                  }
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
