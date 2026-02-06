import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  Grid,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Add, Save } from '@mui/icons-material';
import { taxonomyApi } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';
import type { Category } from '../types';

export default function Taxonomy() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await taxonomyApi.getCategories();
      const categoryList = Object.entries(data.categories || {}).map(([key, cat]) => ({
        ...cat,
        id: key,
      }));
      setCategories(categoryList);
      if (categoryList.length > 0) {
        setSelectedCategory(categoryList[0]);
      }
    } catch (error: any) {
      showSnackbar('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeyword = () => {
    if (!selectedCategory || !newKeyword.trim()) return;

    const updated = {
      ...selectedCategory,
      keywords: [...selectedCategory.keywords, newKeyword.trim()],
    };
    setSelectedCategory(updated);
    setNewKeyword('');
  };

  const handleDeleteKeyword = (keyword: string) => {
    if (!selectedCategory) return;

    const updated = {
      ...selectedCategory,
      keywords: selectedCategory.keywords.filter((k) => k !== keyword),
    };
    setSelectedCategory(updated);
  };

  const handleSave = async () => {
    if (!selectedCategory) return;

    setSaving(true);
    try {
      await taxonomyApi.updateKeywords(selectedCategory.id, selectedCategory.keywords);
      showSnackbar('Keywords saved successfully', 'success');
      await loadCategories();
    } catch (error: any) {
      showSnackbar('Failed to save keywords', 'error');
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
        Category Taxonomy
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Categories
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  fullWidth
                  variant={selectedCategory?.id === cat.id ? 'contained' : 'text'}
                  onClick={() => setSelectedCategory(cat)}
                  sx={{ mb: 1, justifyContent: 'flex-start' }}
                >
                  {cat.name}
                </Button>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          {selectedCategory ? (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {selectedCategory.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Path: {selectedCategory.path.join(' > ')}
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Keywords
              </Typography>
              <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                {selectedCategory.keywords.map((keyword) => (
                  <Chip
                    key={keyword}
                    label={keyword}
                    onDelete={() => handleDeleteKeyword(keyword)}
                  />
                ))}
              </Box>

              <Box display="flex" gap={1} mb={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Add keyword"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                />
                <Button variant="contained" startIcon={<Add />} onClick={handleAddKeyword}>
                  Add
                </Button>
              </Box>

              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Paper>
          ) : (
            <Paper sx={{ p: 3 }}>
              <Typography variant="body1" color="text.secondary" align="center">
                Select a category to manage keywords
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
