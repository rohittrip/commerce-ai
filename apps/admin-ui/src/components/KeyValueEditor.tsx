import React from 'react';
import {
  Box,
  TextField,
  IconButton,
  Button,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface KeyValuePair {
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  title?: string;
  entries: Record<string, string>;
  onChange: (entries: Record<string, string>) => void;
  keyLabel?: string;
  valueLabel?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  disabled?: boolean;
}

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  title,
  entries,
  onChange,
  keyLabel = 'Key',
  valueLabel = 'Value',
  keyPlaceholder = 'Enter key',
  valuePlaceholder = 'Enter value',
  disabled = false,
}) => {
  const pairs: KeyValuePair[] = Object.entries(entries).map(([key, value]) => ({
    key,
    value,
  }));

  const handleKeyChange = (index: number, newKey: string) => {
    const oldKey = pairs[index].key;
    const newEntries = { ...entries };
    delete newEntries[oldKey];
    newEntries[newKey] = pairs[index].value;
    onChange(newEntries);
  };

  const handleValueChange = (index: number, newValue: string) => {
    const key = pairs[index].key;
    onChange({ ...entries, [key]: newValue });
  };

  const handleAdd = () => {
    let newKey = 'new-key';
    let counter = 1;
    while (entries[newKey] !== undefined) {
      newKey = `new-key-${counter}`;
      counter++;
    }
    onChange({ ...entries, [newKey]: '' });
  };

  const handleDelete = (key: string) => {
    const newEntries = { ...entries };
    delete newEntries[key];
    onChange(newEntries);
  };

  return (
    <Box>
      {title && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2">{title}</Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={disabled}
          >
            Add
          </Button>
        </Box>
      )}

      {pairs.length === 0 && !title && (
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          disabled={disabled}
        >
          Add Entry
        </Button>
      )}

      {pairs.map((pair, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <TextField
            label={keyLabel}
            value={pair.key}
            onChange={(e) => handleKeyChange(index, e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            placeholder={keyPlaceholder}
            disabled={disabled}
          />
          <TextField
            label={valueLabel}
            value={pair.value}
            onChange={(e) => handleValueChange(index, e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            placeholder={valuePlaceholder}
            disabled={disabled}
          />
          <IconButton
            size="small"
            onClick={() => handleDelete(pair.key)}
            disabled={disabled}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ))}

      {pairs.length > 0 && !title && (
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          disabled={disabled}
          sx={{ mt: 1 }}
        >
          Add Entry
        </Button>
      )}
    </Box>
  );
};

export default KeyValueEditor;
