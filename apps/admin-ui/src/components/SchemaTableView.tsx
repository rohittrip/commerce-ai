import React, { useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Tooltip,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

interface SchemaProperty {
  name: string;
  displayName: string;
  type: string;
  required: boolean;
  description: string;
  enumValues?: string[];
  defaultValue?: any;
  minimum?: number;
  maximum?: number;
  itemType?: string;
  depth?: number;
}

interface SchemaTableViewProps {
  schema: object | null;
  title?: string;
  emptyMessage?: string;
}

// Convert JSON Schema to flat array of properties for table display
function flattenSchema(schema: any, parentPath: string = '', depth: number = 0): SchemaProperty[] {
  const properties: SchemaProperty[] = [];

  if (!schema || typeof schema !== 'object') return properties;

  const required = schema.required || [];
  const props = schema.properties || {};

  for (const [name, prop] of Object.entries(props) as [string, any][]) {
    const fullPath = parentPath ? `${parentPath}.${name}` : name;

    const property: SchemaProperty = {
      name: fullPath,
      displayName: name,
      type: prop.type || 'any',
      required: required.includes(name),
      description: prop.description || '',
      depth,
    };

    if (prop.enum) {
      property.enumValues = prop.enum;
    }
    if (prop.default !== undefined) {
      property.defaultValue = prop.default;
    }
    if (prop.minimum !== undefined) {
      property.minimum = prop.minimum;
    }
    if (prop.maximum !== undefined) {
      property.maximum = prop.maximum;
    }

    // Handle arrays
    if (prop.type === 'array' && prop.items) {
      if (prop.items.type === 'object') {
        property.itemType = 'object';
        property.type = 'array<object>';
      } else {
        property.type = `array<${prop.items.type || 'any'}>`;
      }
    }

    properties.push(property);

    // Handle nested objects
    if (prop.type === 'object' && prop.properties) {
      const nested = flattenSchema(prop, fullPath, depth + 1);
      properties.push(...nested);
    }

    // Handle arrays with object items
    if (prop.type === 'array' && prop.items?.type === 'object' && prop.items?.properties) {
      const nested = flattenSchema(prop.items, `${fullPath}[]`, depth + 1);
      properties.push(...nested);
    }
  }

  return properties;
}

// Get color for type chip
function getTypeColor(type: string): 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' | 'default' {
  if (type.startsWith('array')) return 'info';
  switch (type) {
    case 'string': return 'primary';
    case 'number': return 'success';
    case 'integer': return 'success';
    case 'boolean': return 'warning';
    case 'object': return 'secondary';
    default: return 'default';
  }
}

export const SchemaTableView: React.FC<SchemaTableViewProps> = ({
  schema,
  title,
  emptyMessage = 'No schema defined',
}) => {
  const properties = useMemo(() => {
    if (!schema) return [];
    return flattenSchema(schema);
  }, [schema]);

  if (!schema || properties.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 1 }}>
        {emptyMessage}
      </Alert>
    );
  }

  return (
    <Box>
      {title && (
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {title}
        </Typography>
      )}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Property</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', width: 120 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', width: 80, textAlign: 'center' }}>Required</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {properties.map((prop, index) => (
              <TableRow
                key={prop.name}
                sx={{
                  '&:hover': { bgcolor: 'action.hover' },
                  bgcolor: index % 2 === 0 ? 'inherit' : 'grey.50',
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {/* Indentation for nested properties */}
                    {prop.depth && prop.depth > 0 && (
                      <Box
                        sx={{
                          width: prop.depth * 16,
                          borderLeft: '1px solid',
                          borderColor: 'grey.300',
                          ml: 1,
                          mr: 1,
                          height: 20,
                        }}
                      />
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: prop.depth === 0 ? 500 : 400,
                        color: prop.depth === 0 ? 'text.primary' : 'text.secondary',
                      }}
                    >
                      {prop.displayName}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Tooltip title={prop.enumValues ? `Values: ${prop.enumValues.join(', ')}` : ''}>
                    <Chip
                      label={prop.type}
                      size="small"
                      color={getTypeColor(prop.type)}
                      variant="outlined"
                      sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {prop.required ? (
                    <CheckCircleIcon fontSize="small" color="success" />
                  ) : (
                    <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                    {prop.description}
                    {prop.defaultValue !== undefined && (
                      <Typography component="span" sx={{ ml: 1, color: 'info.main', fontSize: '0.8rem' }}>
                        (default: {JSON.stringify(prop.defaultValue)})
                      </Typography>
                    )}
                    {prop.enumValues && prop.enumValues.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        {prop.enumValues.map((val) => (
                          <Chip
                            key={val}
                            label={val}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>
                    )}
                    {(prop.minimum !== undefined || prop.maximum !== undefined) && (
                      <Typography component="span" sx={{ ml: 1, color: 'warning.main', fontSize: '0.8rem' }}>
                        (range: {prop.minimum ?? '-∞'} to {prop.maximum ?? '∞'})
                      </Typography>
                    )}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SchemaTableView;
