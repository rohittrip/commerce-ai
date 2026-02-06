import { Box, Paper, Typography } from '@mui/material';
import { formatDateTime } from '@/utils/format';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

const MessageBubble = ({ role, content, createdAt }: MessageBubbleProps) => {
  const isUser = role === 'user';
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.5,
          maxWidth: '85%',
          bgcolor: isUser ? 'primary.main' : 'background.paper',
          color: isUser ? 'primary.contrastText' : 'text.primary',
          borderRadius: 2,
          borderTopRightRadius: isUser ? 4 : 2,
          borderTopLeftRadius: isUser ? 2 : 4,
          boxShadow: isUser ? 'none' : '0px 8px 24px rgba(15, 23, 42, 0.06)',
        }}
      >
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography>
        {createdAt ? (
          <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
            {formatDateTime(createdAt)}
          </Typography>
        ) : null}
      </Paper>
    </Box>
  );
};

export default MessageBubble;
