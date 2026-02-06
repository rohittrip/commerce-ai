import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Checkbox,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CategoryIcon from '@mui/icons-material/Category';
import { useSnackbar } from '../contexts/SnackbarContext';
import { categoriesApi, providersApi } from '../services/api';
import type { ProviderCategory } from '../types';

interface ProviderCategoriesTabProps {
  providerId: string;
}

// Map category icon names to MUI icons or emoji
const getCategoryIcon = (icon?: string): string => {
  const iconMap: Record<string, string> = {
    restaurant: '🍽️',
    medical_services: '💊',
    devices: '📱',
    checkroom: '👔',
    home: '🏠',
    spa: '💄',
    sports_soccer: '⚽',
    menu_book: '📚',
    toys: '🧸',
    directions_car: '🚗',
  };
  return iconMap[icon || ''] || '📦';
};

export const ProviderCategoriesTab: React.FC<ProviderCategoriesTabProps> = ({ providerId }) => {
  const { showSnackbar } = useSnackbar();
  const [allCategories, setAllCategories] = useState<ProviderCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [initialCategoryIds, setInitialCategoryIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [categories, providerCategories] = await Promise.all([
        categoriesApi.getAll(),
        providersApi.getCategories(providerId),
      ]);
      setAllCategories(categories);
      const selectedIds = new Set(providerCategories.map((c) => c.id));
      setSelectedCategoryIds(selectedIds);
      setInitialCategoryIds(selectedIds);
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to fetch categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [providerId, showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await providersApi.updateCategories(providerId, Array.from(selectedCategoryIds));
      setInitialCategoryIds(new Set(selectedCategoryIds));
      showSnackbar('Categories updated successfully', 'success');
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to update categories', 'error');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (selectedCategoryIds.size !== initialCategoryIds.size) return true;
    for (const id of selectedCategoryIds) {
      if (!initialCategoryIds.has(id)) return true;
    }
    return false;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon /> Supported Categories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select the product categories this provider supports
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={!hasChanges() || saving}
        >
          Save Changes
        </Button>
      </Box>

      {allCategories.length === 0 ? (
        <Alert severity="info">
          No categories defined. Contact an administrator to add categories.
        </Alert>
      ) : (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            Selected {selectedCategoryIds.size} of {allCategories.length} categories
          </Alert>

          <Grid container spacing={2}>
            {allCategories.map((category) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={category.id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderColor: selectedCategoryIds.has(category.id) ? 'primary.main' : 'divider',
                    borderWidth: selectedCategoryIds.has(category.id) ? 2 : 1,
                    bgcolor: selectedCategoryIds.has(category.id) ? 'action.selected' : 'inherit',
                  }}
                >
                  <CardActionArea onClick={() => handleToggleCategory(category.id)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Checkbox
                          checked={selectedCategoryIds.has(category.id)}
                          onChange={() => handleToggleCategory(category.id)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ p: 0 }}
                        />
                        <Box sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" component="span" sx={{ fontSize: '1.25rem' }}>
                              {getCategoryIcon(category.icon)}
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={500}>
                              {category.name}
                            </Typography>
                          </Box>
                          {category.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {category.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {selectedCategoryIds.size > 0 && (
            <Paper sx={{ p: 2, mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Selected Categories:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Array.from(selectedCategoryIds).map((id) => {
                  const cat = allCategories.find((c) => c.id === id);
                  return cat ? (
                    <Chip
                      key={id}
                      label={cat.name}
                      onDelete={() => handleToggleCategory(id)}
                      icon={<span>{getCategoryIcon(cat.icon)}</span>}
                    />
                  ) : null;
                })}
              </Box>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default ProviderCategoriesTab;
