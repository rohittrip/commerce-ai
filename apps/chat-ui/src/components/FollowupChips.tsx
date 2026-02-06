import { Box, Chip } from '@mui/material';

interface FollowupChipsProps {
  suggestions: string[];
  onSelect: (value: string) => void;
}

const FollowupChips = ({ suggestions, onSelect }: FollowupChipsProps) => {
  if (!suggestions.length) return null;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {suggestions.map(suggestion => (
        <Chip
          key={suggestion}
          label={suggestion}
          variant="outlined"
          onClick={() => onSelect(suggestion)}
        />
      ))}
    </Box>
  );
};

export default FollowupChips;
