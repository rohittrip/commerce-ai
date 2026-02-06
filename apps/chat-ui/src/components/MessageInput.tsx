import { useCallback, useState } from 'react';
import { Box, Button, Paper, TextField } from '@mui/material';
import FollowupChips from './FollowupChips';

interface MessageInputProps {
  onSend: (message: string) => void | Promise<void>;
  disabled?: boolean;
  followups: string[];
}

const MessageInput = ({ onSend, disabled, followups }: MessageInputProps) => {
  const [value, setValue] = useState('');

  const handleSend = useCallback(async () => {
    if (!value.trim()) return;
    await onSend(value.trim());
    setValue('');
  }, [onSend, value]);

  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <FollowupChips suggestions={followups} onSelect={message => onSend(message)} />
        <TextField
          placeholder="Ask for products, compare options, or checkout..."
          multiline
          minRows={2}
          maxRows={6}
          value={value}
          onChange={event => setValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleSend} disabled={disabled || !value.trim()}>
            Send
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default MessageInput;
